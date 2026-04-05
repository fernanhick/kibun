/**
 * On-device sentiment analysis using ONNX Runtime.
 *
 * Architecture:
 *   Input:  int32[1, 128]  — padded word-index sequence (max 128 tokens)
 *   Output: float32[1, 3]  — softmax probabilities [negative, neutral, positive]
 *
 * Model file: assets/models/sentiment.onnx
 * Vocabulary: assets/models/vocab.json  (word → index mapping, 5 000 entries)
 *
 * Generate both files by running:
 *   python scripts/train_sentiment_model.py
 *
 * The model degrades gracefully: if the asset is not yet present (first build
 * before training), all inference calls return null and the UI hides the
 * sentiment indicator. No crash, no user-visible error.
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import type { SentimentLabel } from '@models/index';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SEQ_LEN = 128;
const PAD_ID = 0;
const UNK_ID = 1;

// LABELS[i] maps output index → SentimentLabel
const LABELS: SentimentLabel[] = ['negative', 'neutral', 'positive'];

// ─── Module-level state ───────────────────────────────────────────────────────

let session: InferenceSession | null = null;
let vocab: Record<string, number> | null = null;
let initPromise: Promise<void> | null = null;
let modelUnavailable = false; // set true on first failed load — stops retrying

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Load the ONNX model and vocabulary. Called once; subsequent calls are no-ops.
 * Silently marks modelUnavailable if assets are missing (pre-training build).
 */
async function init(): Promise<void> {
  if (session || modelUnavailable) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Require both assets — Metro bundles them at build time.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const modelAsset = require('../../assets/models/sentiment.onnx');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vocabAsset = require('../../assets/models/vocab.json');

      vocab = vocabAsset as Record<string, number>;
      session = await InferenceSession.create(modelAsset);

      if (__DEV__) {
        console.log('[kibun:sentiment] ONNX model loaded');
      }
    } catch (err) {
      modelUnavailable = true;
      if (__DEV__) {
        console.warn('[kibun:sentiment] Model not available — run scripts/train_sentiment_model.py to generate assets/models/sentiment.onnx', err);
      }
    }
  })();

  return initPromise;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

/**
 * Simple whitespace + punctuation tokenizer.
 * Lowercases, strips punctuation, splits on whitespace.
 * Matches the tokenizer used in train_sentiment_model.py.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Convert token strings to padded int32 index sequence of fixed length MAX_SEQ_LEN.
 * Unknown words map to UNK_ID (1). Padded with PAD_ID (0).
 */
function encode(tokens: string[]): Int32Array {
  const ids = new Int32Array(MAX_SEQ_LEN).fill(PAD_ID);
  const len = Math.min(tokens.length, MAX_SEQ_LEN);
  for (let i = 0; i < len; i++) {
    ids[i] = vocab![tokens[i]] ?? UNK_ID;
  }
  return ids;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SentimentResult {
  label: SentimentLabel;
  score: number;      // confidence for the winning label (0–1)
  scores: {           // full distribution
    negative: number;
    neutral: number;
    positive: number;
  };
}

/**
 * Analyse the sentiment of a short text string using the on-device ONNX model.
 *
 * Returns null when:
 *   - The model asset has not been generated yet (pre-training build)
 *   - The input text is empty or too short (<3 words)
 *   - Any runtime error occurs during inference
 *
 * This function is safe to call from any component — it never throws.
 * Kick off init() eagerly from app startup to pre-warm the model.
 */
export async function analyseSentiment(text: string): Promise<SentimentResult | null> {
  const tokens = tokenize(text);
  if (tokens.length < 3) return null; // Too short to be meaningful

  try {
    await init();
    if (!session || !vocab) return null;

    const inputIds = encode(tokens);
    const inputTensor = new Tensor('int32', inputIds, [1, MAX_SEQ_LEN]);
    const feeds = { input_ids: inputTensor };

    const results = await session.run(feeds);
    const logits = results['output']?.data as Float32Array | undefined;
    if (!logits || logits.length !== 3) return null;

    // Softmax (model outputs logits, not probabilities)
    const maxLogit = Math.max(logits[0], logits[1], logits[2]);
    const exps = [
      Math.exp(logits[0] - maxLogit),
      Math.exp(logits[1] - maxLogit),
      Math.exp(logits[2] - maxLogit),
    ];
    const sumExps = exps[0] + exps[1] + exps[2];
    const probs = exps.map((e) => e / sumExps);

    const winnerIdx = probs.indexOf(Math.max(...probs));

    return {
      label: LABELS[winnerIdx],
      score: probs[winnerIdx],
      scores: {
        negative: probs[0],
        neutral: probs[1],
        positive: probs[2],
      },
    };
  } catch (err) {
    if (__DEV__) {
      console.error('[kibun:sentiment] Inference error:', err);
    }
    return null;
  }
}

/**
 * Pre-warm the ONNX session at app startup so the first inference is fast.
 * Call this fire-and-forget — it never throws.
 */
export function prewarmSentimentModel(): void {
  init().catch(() => {});
}

// ─── Mood–Sentiment Alignment ─────────────────────────────────────────────────

export type MoodSentimentAlignment = 'aligned' | 'contrary' | 'neutral';

/** mood groups that correspond to each expected sentiment */
const POSITIVE_GROUPS = new Set(['green']);
const NEGATIVE_GROUPS = new Set(['red-orange', 'blue']);

/**
 * Check whether a sentiment result aligns with the user's mood selection.
 * Used by MoodConfirmScreen to surface a gentle contradiction prompt.
 *
 * Returns 'neutral' if either side is ambiguous:
 *   - Mood group is 'neutral' (meh/tired/bored/confused — no strong expectation)
 *   - Sentiment score < 0.6 (model not confident)
 *   - Sentiment label is 'neutral'
 */
export function getMoodSentimentAlignment(
  moodGroup: string,
  result: SentimentResult
): MoodSentimentAlignment {
  if (result.score < 0.6 || result.label === 'neutral') return 'neutral';
  if (moodGroup === 'neutral') return 'neutral';

  const expectPositive = POSITIVE_GROUPS.has(moodGroup);
  const expectNegative = NEGATIVE_GROUPS.has(moodGroup);

  if (expectPositive && result.label === 'negative') return 'contrary';
  if (expectNegative && result.label === 'positive') return 'contrary';
  return 'aligned';
}
