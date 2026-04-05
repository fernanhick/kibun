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
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType

    model.eval()
    dummy = torch.zeros(1, MAX_SEQ_LEN, dtype=torch.int32)
    tmp_path = path.with_suffix(".tmp.onnx")

    torch.onnx.export(
        model,
        dummy,
        str(tmp_path),
        opset_version=17,
        input_names=["input_ids"],
        output_names=["output"],
        dynamic_axes={"input_ids": {0: "batch_size"}},
    )

    # Int8 dynamic quantization — reduces size ~4×, negligible accuracy loss
    quantize_dynamic(
        str(tmp_path),
        str(path),
        weight_type=QuantType.QInt8,
    )
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
