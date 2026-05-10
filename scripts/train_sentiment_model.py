#!/usr/bin/env python3
"""
train_sentiment_model.py
────────────────────────
Trains a tiny 3-class sentiment classifier (negative / neutral / positive)
and exports it as:

  assets/models/sentiment.onnx   — ONNX model (int8 quantized, ~200 KB)
  assets/models/vocab.json        — word → token-index mapping (5 000 entries)

Requirements
────────────
  pip install torch datasets scikit-learn onnx onnxruntime numpy

Usage
─────
    python scripts/train_sentiment_model.py --language en
    python scripts/train_sentiment_model.py --language es

Run from the repository root (d:/Projects/gorhick workspace/apps/kibun).
"""

import json
import os
import re
import argparse
import random
import collections
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

# ─── Config ──────────────────────────────────────────────────────────────────

VOCAB_SIZE    = 5_000   # top N words (index 0 = PAD, 1 = UNK; words start at 2)
EMBED_DIM     = 64
HIDDEN_DIM    = 64
NUM_CLASSES   = 3       # 0=negative, 1=neutral, 2=positive
MAX_SEQ_LEN   = 128
BATCH_SIZE    = 256
EPOCHS        = 8
LR            = 1e-3
DEFAULT_MAX_SAMPLES_EN = 60_000
DEFAULT_MAX_SAMPLES_ES = 40_000

OUT_DIR       = Path("assets/models")
MODEL_PATH    = OUT_DIR / "sentiment.onnx"
VOCAB_PATH    = OUT_DIR / "vocab.json"

# ─── Tokenizer (must match src/lib/sentiment.ts) ─────────────────────────────

def tokenize(text: str, language: str = "en") -> list[str]:
    text = text.lower()
    if language == "es":
        text = re.sub(r"[^a-z0-9\u00c0-\u024f\s']", " ", text)
    else:
        text = re.sub(r"[^a-z0-9\s']", " ", text)
    return [t for t in text.split() if t]

# ─── Dataset ─────────────────────────────────────────────────────────────────

def _truncate_dataset(
    texts: list[str],
    labels: list[int],
    max_samples: int | None,
    *,
    seed: int = 42,
):
    if not max_samples or len(texts) <= max_samples:
        return texts, labels
    rng = random.Random(seed)
    idx = list(range(len(texts)))
    rng.shuffle(idx)
    keep = idx[:max_samples]
    return [texts[i] for i in keep], [labels[i] for i in keep]


def _sample_balanced_by_label(
    texts: list[str],
    labels: list[int],
    target_total: int,
    *,
    seed: int = 42,
):
    if target_total <= 0 or len(texts) <= target_total:
        return texts, labels

    rng = random.Random(seed)
    by_label: dict[int, list[int]] = {0: [], 1: [], 2: []}
    for i, lbl in enumerate(labels):
        if lbl in by_label:
            by_label[lbl].append(i)

    for idxs in by_label.values():
        rng.shuffle(idxs)

    # Aim for a roughly balanced subset across classes.
    quota = target_total // NUM_CLASSES
    selected: list[int] = []
    leftovers: list[int] = []

    for lbl in (0, 1, 2):
        idxs = by_label[lbl]
        take = min(len(idxs), quota)
        selected.extend(idxs[:take])
        leftovers.extend(idxs[take:])

    if len(selected) < target_total:
        rng.shuffle(leftovers)
        selected.extend(leftovers[: target_total - len(selected)])

    rng.shuffle(selected)
    return [texts[i] for i in selected], [labels[i] for i in selected]


def _load_spanish_dataset(texts: list[str], labels: list[int], max_samples: int | None):
    from datasets import load_dataset as hf_load

    target = max_samples or DEFAULT_MAX_SAMPLES_ES
    loaded_sources: list[str] = []

    def add_example(text: str, lbl: int):
        txt = (text or "").strip()
        if lbl not in (0, 1, 2):
            return
        if 5 < len(txt) < 400:
            texts.append(txt)
            labels.append(lbl)

    # Source 1: 3-class corpus (negative/neutral/positive)
    try:
        print("Loading Spanish sentiment dataset (AntoineBlanot/sentiment-es)...")
        ds = hf_load("AntoineBlanot/sentiment-es", split="train")
        label_map = {"negative": 0, "neutral": 1, "positive": 2}
        for row in ds:
            lbl = label_map.get(str(row.get("label_name", "")).strip().lower())
            if lbl is not None:
                add_example(row.get("text", ""), lbl)
        loaded_sources.append("AntoineBlanot/sentiment-es")
    except Exception as err:
        print(f"Spanish source failed (AntoineBlanot/sentiment-es): {err}")

    # Source 2: 3-class targeted headlines.
    try:
        print("Loading Spanish headlines dataset (pysentimiento/spanish-targeted-sentiment-headlines)...")
        ds = hf_load("pysentimiento/spanish-targeted-sentiment-headlines", split="train")
        for row in ds:
            lbl = row.get("label")
            if isinstance(lbl, (int, np.integer)) and 0 <= int(lbl) <= 2:
                add_example(row.get("titulo", ""), int(lbl))
        loaded_sources.append("pysentimiento/spanish-targeted-sentiment-headlines")
    except Exception as err:
        print(f"Spanish source failed (pysentimiento/spanish-targeted-sentiment-headlines): {err}")

    # Source 3: large binary corpus to expand positive/negative coverage.
    try:
        sst2_target = max(target, 20_000)
        split = f"train[:{sst2_target}]"
        print(f"Loading Spanish SST2 translation (mrm8488/sst2-es-mt, split={split})...")
        ds = hf_load("mrm8488/sst2-es-mt", split=split)
        for row in ds:
            raw_lbl = row.get("label")
            if raw_lbl in (0, 1):
                mapped = 0 if int(raw_lbl) == 0 else 2
                add_example(row.get("sentence_es") or row.get("sentence") or "", mapped)
        loaded_sources.append("mrm8488/sst2-es-mt")
    except Exception as err:
        print(f"Spanish source failed (mrm8488/sst2-es-mt): {err}")

    if not loaded_sources:
        raise RuntimeError("No external Spanish datasets could be loaded")

    # External corpora are often binary-heavy; keep a healthier neutral floor.
    neutral_count = sum(1 for lbl in labels if lbl == 1)
    min_neutral = max(600, target // 5)
    if neutral_count < min_neutral:
        _add_spanish_neutral_boost(texts, labels, min_neutral - neutral_count)

    print(f"Spanish external sources used: {', '.join(loaded_sources)}")
    sampled_texts, sampled_labels = _sample_balanced_by_label(texts, labels, target)
    texts[:] = sampled_texts
    labels[:] = sampled_labels


def load_dataset(language: str, max_samples: int | None = None):
    """
    Loads language-specific sentiment datasets from Hugging Face.
    English: SST-2 (binary) + neutral subset from Wikipedia.
    Spanish: script-less external corpora with label mapping and balancing.

    Falls back to a tiny synthetic dataset if datasets library is not available.
    """
    texts, labels = [], []

    try:
        from datasets import load_dataset as hf_load
        if language == "es":
            _load_spanish_dataset(texts, labels, max_samples)
            if len(texts) < 500:
                raise RuntimeError("Spanish dataset yielded too few usable samples")
            return texts, labels

        print("Loading SST-2 from Hugging Face...")
        split = f"train[:{max_samples or DEFAULT_MAX_SAMPLES_EN}]"
        sst2 = hf_load("sst2", split=split)
        for row in sst2:
            lbl = 0 if row["label"] == 0 else 2  # SST-2: 0=neg, 1=pos → our 0=neg, 2=pos
            texts.append(row["sentence"])
            labels.append(lbl)

        # Add neutral examples from Wikipedia sentences (subset via datasets)
        try:
            print("Loading Wikipedia neutrals (this may take a while)...")
            wiki = hf_load("wikipedia", "20220301.en", split="train", streaming=True)
            neutral_added = 0
            for article in wiki:
                for sentence in article["text"].split(". "):
                    sentence = sentence.strip()
                    if 10 < len(sentence) < 150:
                        texts.append(sentence)
                        labels.append(1)
                        neutral_added += 1
                        if neutral_added >= 10_000:
                            break
                if neutral_added >= 10_000:
                    break
        except Exception:
            print("Wikipedia streaming failed — using fewer neutral samples.")

    except ImportError:
        print("WARNING: 'datasets' library not found. Using synthetic data.")
        print("Install with: pip install datasets")
        print("Continuing with small synthetic dataset (accuracy will be lower)...")
        _add_synthetic(texts, labels, language)
    except Exception as err:
        print(f"WARNING: dataset load failed ({err}). Using synthetic data.")
        _add_synthetic(texts, labels, language)

    return _truncate_dataset(texts, labels, max_samples)


def _add_synthetic(texts, labels, language: str = "en"):
    """Minimal synthetic dataset for offline/quick testing."""
    positive = [
        "I feel amazing today", "This is wonderful news", "feeling grateful and happy",
        "had a great day at work", "so excited about this", "love this feeling",
        "everything is going well", "feeling really good", "awesome day",
        "feeling blessed and thankful",
    ]
    negative = [
        "I feel terrible today", "this is awful", "feeling very anxious",
        "had a rough day", "so frustrated right now", "feeling really down",
        "nothing is going right", "feeling sad and lonely", "horrible experience",
        "feeling exhausted and stressed",
    ]
    neutral = [
        "today is Monday", "I went to the store", "had lunch at noon",
        "watched a movie", "it rained today", "worked from home",
        "attended a meeting", "read for an hour", "cooked dinner",
        "went for a walk",
    ]
    if language == "es":
        positive = [
            "hoy me siento increible", "que buena noticia", "me siento agradecido y feliz",
            "tuve un gran dia", "estoy muy emocionado", "me encanta esta sensacion",
            "todo va bien", "me siento muy bien", "dia genial", "me siento bendecido",
        ]
        negative = [
            "hoy me siento fatal", "esto es horrible", "me siento muy ansioso",
            "tuve un dia duro", "estoy muy frustrado", "me siento decaido",
            "nada sale bien", "me siento triste y solo", "experiencia horrible",
            "me siento agotado y estresado",
        ]
        neutral = [
            "hoy es lunes", "fui a la tienda", "almorce al mediodia",
            "vi una pelicula", "hoy llovio", "trabaje desde casa",
            "asisti a una reunion", "lei una hora", "cocine la cena",
            "sali a caminar",
        ]
        _add_spanish_synthetic_expanded(texts, labels)
        return
    for s in positive:
        texts.append(s); labels.append(2)
    for s in negative:
        texts.append(s); labels.append(0)
    for s in neutral:
        texts.append(s); labels.append(1)


def _add_spanish_synthetic_expanded(texts, labels):
    """Larger synthetic Spanish corpus used when remote datasets are unavailable."""
    positive_states = [
        "feliz", "tranquilo", "motivado", "agradecido", "optimista", "entusiasmado",
        "en paz", "con energia", "esperanzado", "contento", "animado", "sereno",
    ]
    negative_states = [
        "agotado", "triste", "ansioso", "frustrado", "abrumado", "decaido",
        "desanimado", "irritable", "estresado", "tenso", "inquieto", "vacio",
    ]
    neutral_states = [
        "normal", "estable", "en piloto automatico", "sin cambios", "mas o menos",
        "neutral", "sin mucho que reportar", "igual que ayer", "en rutina", "tranquilo sin picos",
    ]
    positive_contexts = [
        "despues de hablar con un amigo", "tras terminar mis pendientes", "luego de caminar",
        "porque dormi bien", "despues de hacer ejercicio", "tras un buen cafe",
        "al cerrar el dia", "al empezar la manana", "despues de meditar", "tras escuchar musica",
    ]
    negative_contexts = [
        "por falta de descanso", "despues de una reunion dificil", "por mucha presion",
        "tras una mala noche", "por demasiadas tareas", "despues de discutir",
        "al final de la tarde", "por preocupaciones acumuladas", "con la mente acelerada", "con poco tiempo",
    ]
    neutral_contexts = [
        "en un dia habitual", "durante la rutina", "sin novedades importantes",
        "entre tareas normales", "con una jornada tranquila", "sin eventos especiales",
        "en una tarde comun", "en un dia de trabajo regular", "como cualquier otro dia", "en modo automatico",
    ]

    max_per_class = 3500

    def build_samples(states, contexts, templates):
        out = []
        for tpl in templates:
            for st in states:
                for cx in contexts:
                    out.append(tpl.format(state=st, context=cx))
                    if len(out) >= max_per_class:
                        return out
        return out

    pos_templates = [
        "hoy me siento {state} {context}",
        "me noto {state} {context}",
        "estoy {state} y con buena vibra {context}",
        "ahora mismo estoy {state} {context}",
    ]
    neg_templates = [
        "hoy me siento {state} {context}",
        "me noto {state} {context}",
        "estoy {state} y me cuesta concentrarme {context}",
        "ahora mismo estoy {state} {context}",
    ]
    neu_templates = [
        "hoy me siento {state} {context}",
        "me noto {state} {context}",
        "estoy {state} {context}",
        "ahora mismo sigo {state} {context}",
    ]

    positive = build_samples(positive_states, positive_contexts, pos_templates)
    negative = build_samples(negative_states, negative_contexts, neg_templates)
    neutral = build_samples(neutral_states, neutral_contexts, neu_templates)

    for s in positive:
        texts.append(s); labels.append(2)
    for s in negative:
        texts.append(s); labels.append(0)
    for s in neutral:
        texts.append(s); labels.append(1)


def _add_spanish_neutral_boost(texts: list[str], labels: list[int], needed: int):
    if needed <= 0:
        return
    templates = [
        "hoy me siento en calma, sin grandes cambios y con una rutina estable",
        "mi energia esta estable y el dia transcurre normal",
        "estoy en un punto neutral, ni arriba ni abajo",
        "todo va en orden, sin novedades importantes",
        "me mantengo equilibrado durante una jornada comun",
        "hoy ha sido un dia normal, con tareas de siempre",
        "sigo mi rutina habitual y me siento estable",
        "mi estado de animo se mantiene parejo en este momento",
        "no noto cambios fuertes, me siento mas o menos igual",
        "estoy tranquilo y enfocado en actividades cotidianas",
    ]
    for i in range(needed):
        texts.append(templates[i % len(templates)])
        labels.append(1)

# ─── Vocabulary ───────────────────────────────────────────────────────────────

def build_vocab(texts: list[str], vocab_size: int, language: str) -> dict[str, int]:
    """
    Build vocabulary from training corpus.
    Index 0 = PAD (padding)
    Index 1 = UNK (unknown)
    Index 2..vocab_size+1 = top words by frequency
    """
    counter = collections.Counter()
    for text in texts:
        counter.update(tokenize(text, language))
    # Reserve 0=PAD, 1=UNK
    vocab = {"<PAD>": 0, "<UNK>": 1}
    for word, _ in counter.most_common(vocab_size - 2):
        vocab[word] = len(vocab)
    return vocab

def encode(text: str, vocab: dict[str, int], max_len: int, language: str) -> list[int]:
    tokens = tokenize(text, language)[:max_len]
    ids = [vocab.get(t, 1) for t in tokens]  # 1 = UNK
    ids += [0] * (max_len - len(ids))        # 0 = PAD
    return ids

# ─── Model ────────────────────────────────────────────────────────────────────

class TinySentimentModel(nn.Module):
    """
    Embedding → GlobalAveragePool → Dense(64, GELU) → Dropout → Dense(3)

    Linear classifier over pooled word embeddings. Very small (~340 KB float32,
    ~85 KB int8 quantized). Inference: <2 ms on any modern mobile CPU.
    """
    def __init__(self, vocab_size: int, embed_dim: int, hidden_dim: int, num_classes: int):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.dense1    = nn.Linear(embed_dim, hidden_dim)
        self.dropout   = nn.Dropout(0.2)
        self.dense2    = nn.Linear(hidden_dim, num_classes)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        # input_ids: [batch, seq_len]
        padding_mask = (input_ids != 0).float().unsqueeze(-1)           # [B, L, 1]
        emb = self.embedding(input_ids)                                  # [B, L, E]
        # Mean pooling over non-padding positions
        pooled = (emb * padding_mask).sum(1) / padding_mask.sum(1).clamp(min=1)  # [B, E]
        x = F.gelu(self.dense1(pooled))
        x = self.dropout(x)
        return self.dense2(x)  # logits [B, 3]

# ─── Training ─────────────────────────────────────────────────────────────────

def train(texts, labels, vocab, language: str):
    print(f"Encoding {len(texts)} samples...")
    X = torch.tensor([encode(t, vocab, MAX_SEQ_LEN, language) for t in texts], dtype=torch.int32)
    y = torch.tensor(labels, dtype=torch.long)

    dataset = TensorDataset(X, y)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    model = TinySentimentModel(VOCAB_SIZE, EMBED_DIM, HIDDEN_DIM, NUM_CLASSES)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)

    model.train()
    for epoch in range(EPOCHS):
        total_loss, correct, total = 0.0, 0, 0
        for xb, yb in loader:
            optimizer.zero_grad()
            logits = model(xb)
            loss = F.cross_entropy(logits, yb)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(xb)
            correct    += (logits.argmax(1) == yb).sum().item()
            total      += len(xb)

        acc = correct / total
        print(f"Epoch {epoch+1}/{EPOCHS}  loss={total_loss/total:.4f}  acc={acc:.3f}")

    return model

# ─── ONNX Export ──────────────────────────────────────────────────────────────

def export_onnx(model: nn.Module, path: Path):
    """
    Build ONNX graph manually from model weights.
    Avoids torch.onnx.export (which requires onnxscript in torch >= 2.6).
    Only needs the `onnx` and `onnxruntime` packages.
    """
    import onnx
    from onnx import helper, TensorProto, numpy_helper
    from onnxruntime.quantization import quantize_dynamic, QuantType

    model.eval()
    with torch.no_grad():
        emb_w = model.embedding.weight.detach().cpu().numpy().astype(np.float32)  # [V,E]
        fc1_w = model.dense1.weight.detach().cpu().numpy().astype(np.float32)     # [H,E]
        fc1_b = model.dense1.bias.detach().cpu().numpy().astype(np.float32)       # [H]
        fc2_w = model.dense2.weight.detach().cpu().numpy().astype(np.float32)     # [C,H]
        fc2_b = model.dense2.bias.detach().cpu().numpy().astype(np.float32)       # [C]

    # ── Initializers (weights + scalar constants) ─────────────────────────────
    inits = [
        numpy_helper.from_array(emb_w,  name='emb_w'),
        numpy_helper.from_array(fc1_w,  name='fc1_w'),
        numpy_helper.from_array(fc1_b,  name='fc1_b'),
        numpy_helper.from_array(fc2_w,  name='fc2_w'),
        numpy_helper.from_array(fc2_b,  name='fc2_b'),
        # Constants
        numpy_helper.from_array(np.array(0,    dtype=np.int32),   name='c_zero_i32'),
        numpy_helper.from_array(np.array([1],  dtype=np.int64),   name='seq_axis'),   # ReduceSum axis
        numpy_helper.from_array(np.array([2],  dtype=np.int64),   name='ax2'),        # Unsqueeze axis
        numpy_helper.from_array(np.array([1.0],dtype=np.float32), name='c_one_f'),   # clamp & GELU
        numpy_helper.from_array(np.array([1.4142135623730951], dtype=np.float32), name='c_sqrt2'),
        numpy_helper.from_array(np.array([0.5],dtype=np.float32), name='c_half'),
    ]

    # ── Nodes ─────────────────────────────────────────────────────────────────
    # Forward pass mirrors TinySentimentModel.forward():
    #   mask = (input_ids != 0).float().unsqueeze(-1)      [B,L,1]
    #   emb  = embedding(input_ids)                        [B,L,E]
    #   pooled = (emb * mask).sum(1) / mask.sum(1).clamp(1)  [B,E]
    #   out  = dense2(gelu(dense1(pooled)))                [B,C]
    nodes = [
        # Padding mask  [B,L] → [B,L,1] float
        helper.make_node('Equal',     ['input_ids', 'c_zero_i32'], ['is_pad']),
        helper.make_node('Not',       ['is_pad'],                   ['not_pad']),
        helper.make_node('Cast',      ['not_pad'],                  ['mask_2d'], to=TensorProto.FLOAT),
        helper.make_node('Unsqueeze', ['mask_2d', 'ax2'],           ['mask_3d']),  # opset13+: axes as input

        # Embedding lookup  [B,L,E]  (cast to int64 for Gather portability)
        helper.make_node('Cast',   ['input_ids'],             ['ids_i64'],    to=TensorProto.INT64),
        helper.make_node('Gather', ['emb_w', 'ids_i64'],      ['emb'],        axis=0),

        # Masked mean pool  [B,E]
        helper.make_node('Mul',       ['emb', 'mask_3d'],          ['masked_emb']),
        helper.make_node('ReduceSum', ['masked_emb', 'seq_axis'],   ['sum_emb'],  keepdims=0),
        helper.make_node('ReduceSum', ['mask_3d',    'seq_axis'],   ['sum_mask'], keepdims=0),
        helper.make_node('Max',       ['sum_mask', 'c_one_f'],      ['clamp_mask']),
        helper.make_node('Div',       ['sum_emb',  'clamp_mask'],   ['pooled']),

        # Dense1 (nn.Linear weight is [out,in] → transB=1 gives X @ W^T)
        helper.make_node('Gemm', ['pooled',   'fc1_w', 'fc1_b'], ['fc1_out'], transB=1),

        # GELU(x) = 0.5 * x * (1 + erf(x / sqrt(2)))
        helper.make_node('Div', ['fc1_out', 'c_sqrt2'], ['g_div']),
        helper.make_node('Erf', ['g_div'],               ['g_erf']),
        helper.make_node('Add', ['g_erf', 'c_one_f'],   ['g_add']),
        helper.make_node('Mul', ['fc1_out', 'g_add'],   ['g_mul']),
        helper.make_node('Mul', ['g_mul',   'c_half'],  ['gelu_out']),

        # Dense2 (no dropout at inference)
        helper.make_node('Gemm', ['gelu_out', 'fc2_w', 'fc2_b'], ['output'], transB=1),
    ]

    # ── Graph / Model ─────────────────────────────────────────────────────────
    graph = helper.make_graph(
        nodes,
        'kibun_sentiment',
        [helper.make_tensor_value_info('input_ids', TensorProto.INT32, [1, MAX_SEQ_LEN])],
        [helper.make_tensor_value_info('output',    TensorProto.FLOAT, [1, NUM_CLASSES])],
        initializer=inits,
    )
    model_proto = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 17)])
    model_proto.ir_version = 8
    onnx.checker.check_model(model_proto)

    # Sanity-check: compare ONNX output vs PyTorch on a test input
    import onnxruntime as ort
    test_ids = torch.zeros(1, MAX_SEQ_LEN, dtype=torch.int32)
    test_ids[0, :5] = torch.tensor([2, 3, 4, 5, 6], dtype=torch.int32)
    with torch.no_grad():
        pt_out  = model(test_ids).numpy()
    sess    = ort.InferenceSession(model_proto.SerializeToString(),
                                   providers=['CPUExecutionProvider'])
    ort_out = sess.run(None, {'input_ids': test_ids.numpy()})[0]
    max_diff = float(np.abs(pt_out - ort_out).max())
    print(f"PyTorch <> ONNX max abs diff: {max_diff:.6f}")
    assert max_diff < 1e-4, f"ONNX output mismatch ({max_diff})"

    # Int8 dynamic quantization → smaller model, negligible accuracy delta
    tmp_path = path.with_suffix('.tmp.onnx')
    onnx.save(model_proto, str(tmp_path))
    quantize_dynamic(str(tmp_path), str(path), weight_type=QuantType.QInt8)
    os.remove(tmp_path)
    size_kb = path.stat().st_size / 1024
    print(f"ONNX model saved: {path}  ({size_kb:.0f} KB)")

WEIGHTS_PATH = OUT_DIR / "weights.json"

def paths_for_language(language: str) -> tuple[Path, Path, Path]:
    if language == "es":
        return (
            OUT_DIR / "sentiment.es.onnx",
            OUT_DIR / "vocab.es.json",
            OUT_DIR / "weights.es.json",
        )
    return (MODEL_PATH, VOCAB_PATH, WEIGHTS_PATH)

# ─── Main ─────────────────────────────────────────────────────────────────────

def export_weights_json(model: nn.Module, path: Path):
    """
    Export model weights as base64-encoded float32 arrays in a JSON file.
    Used by the pure-JS inference engine in src/lib/sentiment.ts.
    Total size: ~1.7 MB (dominated by the 5000×64 embedding matrix).
    """
    import base64

    def to_b64(tensor) -> str:
        arr = tensor.detach().cpu().numpy().astype(np.float32)
        return base64.b64encode(arr.tobytes()).decode('ascii')

    data = {
        "emb":   to_b64(model.embedding.weight),  # [vocab_size, EMBED_DIM]
        "fc1_w": to_b64(model.dense1.weight),      # [HIDDEN_DIM, EMBED_DIM]
        "fc1_b": to_b64(model.dense1.bias),        # [HIDDEN_DIM]
        "fc2_w": to_b64(model.dense2.weight),      # [NUM_CLASSES, HIDDEN_DIM]
        "fc2_b": to_b64(model.dense2.bias),        # [NUM_CLASSES]
    }
    with open(path, "w", encoding="ascii") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=True)  # compact, ASCII-safe
    size_kb = path.stat().st_size / 1024
    print(f"Weights saved:    {path}  ({size_kb:.0f} KB)")


def main():
    parser = argparse.ArgumentParser(description="Train Kibun on-device sentiment model")
    parser.add_argument("--language", choices=["en", "es"], default="en")
    parser.add_argument("--max-samples", type=int, default=None)
    args = parser.parse_args()
    language = args.language

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model_path, vocab_path, weights_path = paths_for_language(language)

    texts, labels = load_dataset(language, args.max_samples)
    print(f"Dataset: {len(texts)} samples  "
          f"(neg={labels.count(0)}, neu={labels.count(1)}, pos={labels.count(2)})")

    vocab = build_vocab(texts, VOCAB_SIZE, language)

    # Save vocab (excluding special tokens <PAD> and <UNK>)
    word_vocab = {k: v for k, v in vocab.items() if k not in ("<PAD>", "<UNK>")}
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump(word_vocab, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Vocabulary saved: {vocab_path}  ({len(word_vocab)} words)")

    model = train(texts, labels, vocab, language)
    export_onnx(model, model_path)
    export_weights_json(model, weights_path)

    print("\nDone. Add to git:")
    print(f"  git add {model_path} {vocab_path} {weights_path}")
    print("\nTo run the app:")
    print("  npx expo run:android")


if __name__ == "__main__":
    main()
