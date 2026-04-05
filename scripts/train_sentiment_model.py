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
  python scripts/train_sentiment_model.py

Run from the repository root (d:/Projects/gorhick workspace/apps/kibun).
"""

import json
import os
import re
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

OUT_DIR       = Path("assets/models")
MODEL_PATH    = OUT_DIR / "sentiment.onnx"
VOCAB_PATH    = OUT_DIR / "vocab.json"

# ─── Tokenizer (must match src/lib/sentiment.ts) ─────────────────────────────

def tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    return [t for t in text.split() if t]

# ─── Dataset ─────────────────────────────────────────────────────────────────

def load_dataset():
    """
    Loads SST-2 (binary) + a neutral sentences subset from Wikipedia.
    SST-2: label 0 = negative → class 0, label 1 = positive → class 2.
    Wikipedia neutral sentences: assigned class 1.

    Falls back to a tiny synthetic dataset if datasets library is not available.
    """
    texts, labels = [], []

    try:
        from datasets import load_dataset as hf_load
        print("Loading SST-2 from Hugging Face...")
        sst2 = hf_load("sst2", split="train")
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
        _add_synthetic(texts, labels)

    return texts, labels


def _add_synthetic(texts, labels):
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
    for s in positive:
        texts.append(s); labels.append(2)
    for s in negative:
        texts.append(s); labels.append(0)
    for s in neutral:
        texts.append(s); labels.append(1)

# ─── Vocabulary ───────────────────────────────────────────────────────────────

def build_vocab(texts: list[str], vocab_size: int) -> dict[str, int]:
    """
    Build vocabulary from training corpus.
    Index 0 = PAD (padding)
    Index 1 = UNK (unknown)
    Index 2..vocab_size+1 = top words by frequency
    """
    counter = collections.Counter()
    for text in texts:
        counter.update(tokenize(text))
    # Reserve 0=PAD, 1=UNK
    vocab = {"<PAD>": 0, "<UNK>": 1}
    for word, _ in counter.most_common(vocab_size - 2):
        vocab[word] = len(vocab)
    return vocab

def encode(text: str, vocab: dict[str, int], max_len: int) -> list[int]:
    tokens = tokenize(text)[:max_len]
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

def train(texts, labels, vocab):
    print(f"Encoding {len(texts)} samples...")
    X = torch.tensor([encode(t, vocab, MAX_SEQ_LEN) for t in texts], dtype=torch.int32)
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
    print(f"PyTorch ↔ ONNX max abs diff: {max_diff:.6f}")
    assert max_diff < 1e-4, f"ONNX output mismatch ({max_diff})"

    # Int8 dynamic quantization → smaller model, negligible accuracy delta
    tmp_path = path.with_suffix('.tmp.onnx')
    onnx.save(model_proto, str(tmp_path))
    quantize_dynamic(str(tmp_path), str(path), weight_type=QuantType.QInt8)
    os.remove(tmp_path)
    size_kb = path.stat().st_size / 1024
    print(f"ONNX model saved: {path}  ({size_kb:.0f} KB)")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    texts, labels = load_dataset()
    print(f"Dataset: {len(texts)} samples  "
          f"(neg={labels.count(0)}, neu={labels.count(1)}, pos={labels.count(2)})")

    vocab = build_vocab(texts, VOCAB_SIZE)

    # Save vocab (excluding special tokens <PAD> and <UNK>)
    word_vocab = {k: v for k, v in vocab.items() if k not in ("<PAD>", "<UNK>")}
    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(word_vocab, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Vocabulary saved: {VOCAB_PATH}  ({len(word_vocab)} words)")

    model = train(texts, labels, vocab)
    export_onnx(model, MODEL_PATH)

    print("\nDone. Add to git:")
    print(f"  git add {MODEL_PATH} {VOCAB_PATH}")
    print("\nTo integrate with kibun, rebuild the native app:")
    print("  eas build --profile development --platform android")


if __name__ == "__main__":
    main()
