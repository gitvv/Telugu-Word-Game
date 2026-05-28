// ─── Constants ────────────────────────────────────────────────────────────────

export const HALANT = "్";
export const ANUSVARA = "ం";
export const RRUKAR = "ృ";

export const WORD_LENGTH = 4;

// Independent vowels (standalone — fill box directly)
export const INDEPENDENT_VOWELS = new Set([
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
]);

// Non-advancing modifiers: attach to current box without moving cursor
export const NON_ADVANCING_MODIFIERS = new Set([ANUSVARA, RRUKAR]);

// Dependent vowel signs (matras) — used when parsing a committed akshara for deletion
export const DEPENDENT_VOWEL_SIGNS = new Set([
  "ా", "ి", "ీ", "ు", "ూ", RRUKAR, "ె", "ే", "ై", "ొ", "ో", "ౌ",
]);

export const MODIFIER_SHELF = [
  // Independent vowels
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
  // Dependent vowel signs (ృ between ూ and ె)
  "ా", "ి", "ీ", "ు", "ూ", RRUKAR, "ె", "ే", "ై", "ొ", "ో", "ౌ",
  // ం and ్ moved to the consonant grid and action bar respectively
];

// 7 rows × 5 columns
export const CONSONANT_ROWS = [
  ["క", "ఖ", "గ", "ఘ", "ఙ"],
  ["చ", "ఛ", "జ", "ఝ", "ఞ"],
  ["ట", "ఠ", "డ", "ఢ", "ణ"],
  ["త", "థ", "ద", "ధ", "న"],
  ["ప", "ఫ", "బ", "భ", "మ"],
  ["య", "ర", "ల", "వ", "శ"],
  ["ష", "స", "హ", "ళ", ANUSVARA],
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedbackColor = "green" | "yellow" | "gray";

// ─── Akshara builder ──────────────────────────────────────────────────────────

export interface AksharaBuilder {
  consonants: string[];
  vowelSign: string | null;
  pendingHalant: boolean;
}

export const emptyBuilder = (): AksharaBuilder => ({
  consonants: [],
  vowelSign: null,
  pendingHalant: false,
});

export function renderBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  const cluster = b.consonants.join(HALANT);
  return cluster + (b.pendingHalant ? HALANT : "") + (b.vowelSign ?? "");
}

export function finalizeBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  return b.consonants.join(HALANT) + (b.vowelSign ?? "");
}

// Parse a committed akshara string back into an AksharaBuilder for step-by-step deletion.
// Strips the trailing vowel sign (if any) or anusvara, then splits the rest by halant.
export function reopenCommitted(s: string): { builder: AksharaBuilder; hadAnusvara: boolean } {
  let codePoints = [...s]; // spread respects Unicode scalar values
  let hadAnusvara = false;

  // Strip trailing anusvara first (it's the outermost layer)
  if (codePoints[codePoints.length - 1] === ANUSVARA) {
    hadAnusvara = true;
    codePoints = codePoints.slice(0, -1);
  }

  // Now check for a trailing vowel sign under the anusvara (or as the top layer)
  let vowelSign: string | null = null;
  if (codePoints.length > 0 && DEPENDENT_VOWEL_SIGNS.has(codePoints[codePoints.length - 1])) {
    vowelSign = codePoints[codePoints.length - 1];
    codePoints = codePoints.slice(0, -1);
  }

  const consonants = codePoints.join("").split(HALANT).filter(Boolean);
  return { builder: { consonants, vowelSign, pendingHalant: false }, hadAnusvara };
}

// ─── Feedback helpers ─────────────────────────────────────────────────────────

export function getBaseConsonant(akshara: string): string {
  return [...akshara][0] ?? "";
}

// True when the akshara contains a conjunct consonant (ఒత్తు / halant-joined pair).
export function hasConjunct(akshara: string): boolean {
  return [...akshara].includes("్");
}

// 5-pass priority system — handles duplicate letters correctly.
export function computeFeedback(
  guessBoxes: string[],
  secretAksharas: string[]
): FeedbackColor[] {
  const result: (FeedbackColor | null)[] = Array(WORD_LENGTH).fill(null);

  // Build a mutable inventory of remaining secret aksharas.
  const inventory = new Map<string, number>();
  for (const a of secretAksharas) {
    inventory.set(a, (inventory.get(a) ?? 0) + 1);
  }

  // Pass 1 — Green: exact akshara at exact position.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessBoxes[i] === secretAksharas[i]) {
      result[i] = "green";
      inventory.set(secretAksharas[i], (inventory.get(secretAksharas[i]) ?? 0) - 1);
    }
  }

  // Pass 2 — Exact Yellow: exact akshara exists somewhere else in the secret.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] !== null) continue;
    const g = guessBoxes[i];
    const avail = inventory.get(g) ?? 0;
    if (avail > 0) {
      result[i] = "yellow";
      inventory.set(g, avail - 1);
    }
  }

  // Pass 3 — Clean Yellow: base consonant match and guess has NO conjunct (ఒత్తు).
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] !== null) continue;
    if (hasConjunct(guessBoxes[i])) continue;
    const gBase = getBaseConsonant(guessBoxes[i]);
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (getBaseConsonant(secretAksharas[j]) === gBase) {
        const avail = inventory.get(secretAksharas[j]) ?? 0;
        if (avail > 0) {
          result[i] = "yellow";
          inventory.set(secretAksharas[j], avail - 1);
          break;
        }
      }
    }
  }

  // Pass 4 — Messy Yellow: base consonant match but guess HAS a conjunct (ఒత్తు).
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] !== null) continue;
    if (!hasConjunct(guessBoxes[i])) continue;
    const gBase = getBaseConsonant(guessBoxes[i]);
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (getBaseConsonant(secretAksharas[j]) === gBase) {
        const avail = inventory.get(secretAksharas[j]) ?? 0;
        if (avail > 0) {
          result[i] = "yellow";
          inventory.set(secretAksharas[j], avail - 1);
          break;
        }
      }
    }
  }

  // Pass 5 — Gray: no match at any level.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === null) result[i] = "gray";
  }

  return result as FeedbackColor[];
}

// Deep-search: spread the raw secretWord so every consonant inside a conjunct
// cluster (e.g. the ట hidden in ష్ట్ర) is included in the hot-check.
export function computeHeatmap(secretWord: string): ("hot" | "cold")[] {
  const secretChars = new Set([...secretWord]);
  return CONSONANT_ROWS.map((row) =>
    row.some((c) => secretChars.has(c)) ? "hot" : "cold"
  );
}

// ─── Cluster suggestion data ───────────────────────────────────────────────────

// Word-initial clusters: maps a base consonant to pre-built cluster strings
// that are attested at the start of Telugu words.
export const WORD_INITIAL_CLUSTERS: ReadonlyMap<string, readonly string[]> = new Map([
  ["క",  ["క్ర", "క్వ", "క్ల"]],
  ["ఖ",  ["ఖ్య"]],
  ["గ",  ["గ్ర"]],
  ["ఘ",  ["ఘ్ర"]],
  ["జ",  ["జ్వ", "జ్ఞ"]],
  ["ట",  ["ట్ర"]],
  ["డ",  ["డ్ర"]],
  ["థ",  ["థ్య", "థ్వ"]],
  ["త",  ["త్ర", "త్వ"]],
  ["ద",  ["ద్వ", "ద్ర"]],
  ["ధ",  ["ధ్వ", "ధ్య", "ధ్ర"]],
  ["న",  ["న్య"]],
  ["ప",  ["ప్ర", "ప్ల"]],
  ["ఫ",  ["ఫ్ర", "ఫ్ల", "ఫ్య"]],
  ["బ",  ["బ్ర", "బ్ల", "బ్య"]],
  ["భ",  ["భ్ర"]],
  ["మ",  ["మ్య"]],
  ["వ",  ["వ్ర", "వ్య"]],
  ["శ",  ["శ్ర", "శ్వ", "శ్ల", "శ్మ"]],
  ["స",  ["స్వ", "స్న", "స్థ", "స్త", "స్ప", "స్ఫ", "స్మ", "స్క", "స్ట"]],
  ["హ",  ["హ్ల"]],
]);

// Universal second elements for medial-position clusters, in display order.
// Geminate (same consonant doubled) is computed dynamically — not stored here.
export const MEDIAL_UNIVERSAL_SET: readonly string[] = [
  "ర", "య", "వ", "ల", "మ", "న", "త", "క", "ప",
];

// Consonants that never trigger a Row 2 cluster suggestion strip.
export const NO_ROW2_CONSONANTS: ReadonlySet<string> = new Set([
  "ఙ", "ఞ", "ఝ", "ఠ", "ఢ",
]);
