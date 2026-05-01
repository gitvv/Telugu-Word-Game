import { useState, useRef } from "react";

// ─── Telugu data ──────────────────────────────────────────────────────────────

const HALANT = "్";

const VOWEL_SIGNS = [
  { sign: "ా", label: "aa" },
  { sign: "ి", label: "i" },
  { sign: "ీ", label: "ii" },
  { sign: "ు", label: "u" },
  { sign: "ూ", label: "uu" },
  { sign: "ె", label: "e" },
  { sign: "ే", label: "ee" },
  { sign: "ై", label: "ai" },
  { sign: "ొ", label: "o" },
  { sign: "ో", label: "oo" },
  { sign: "ౌ", label: "au" },
  { sign: HALANT, label: "్" },
  { sign: "ం", label: "am" },
  { sign: "ః", label: "ah" },
];

// 30 consonants in 5 columns
const CONSONANTS = [
  "క", "ఖ", "గ", "ఘ", "ఙ",
  "చ", "ఛ", "జ", "ఝ", "ఞ",
  "ట", "ఠ", "డ", "ఢ", "ణ",
  "త", "థ", "ద", "ధ", "న",
  "ప", "ఫ", "బ", "భ", "మ",
  "య", "ర", "ల", "వ", "శ",
];

const WORD_LENGTH = 4;

// ─── Akshara builder types ────────────────────────────────────────────────────

interface AksharaBuilder {
  consonants: string[];
  vowelSign: string | null;
  pendingHalant: boolean; // user just pressed ్, waiting for next consonant
}

function emptyBuilder(): AksharaBuilder {
  return { consonants: [], vowelSign: null, pendingHalant: false };
}

/** Visual string shown inside the guess box (may include trailing ్ if pending). */
function renderBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  const cluster = b.consonants.join(HALANT);
  const halantSuffix = b.pendingHalant ? HALANT : "";
  const vowel = b.vowelSign ?? "";
  return cluster + halantSuffix + vowel;
}

/** Final committed akshara string. */
function finalizeBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  return b.consonants.join(HALANT) + (b.vowelSign ?? "");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Game() {
  // Committed aksharas (finalized boxes)
  const [boxes, setBoxes] = useState<string[]>(Array(WORD_LENGTH).fill(""));
  // Active box index
  const [activeBox, setActiveBox] = useState<number>(0);
  // In-progress akshara being built
  const [builder, setBuilder] = useState<AksharaBuilder>(emptyBuilder());
  // Toast/hint message
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showHint(msg: string) {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(msg);
    hintTimer.current = setTimeout(() => setHint(null), 2000);
  }

  // ── Commit current builder into the active box and advance ─────────────────
  function commitBuilder(b: AksharaBuilder, box: number) {
    const akshara = finalizeBuilder(b);
    if (!akshara) return;
    setBoxes((prev) => {
      const next = [...prev];
      next[box] = akshara;
      return next;
    });
    setBuilder(emptyBuilder());
    setActiveBox(Math.min(box + 1, WORD_LENGTH));
  }

  // ── Consonant key pressed ──────────────────────────────────────────────────
  function handleConsonant(char: string) {
    if (activeBox >= WORD_LENGTH) {
      showHint("All 4 aksharas filled — submit or clear!");
      return;
    }
    setBuilder((prev) => {
      if (prev.consonants.length === 0 || prev.pendingHalant) {
        // Start or extend a cluster
        return {
          consonants: [...prev.consonants, char],
          vowelSign: null,
          pendingHalant: false,
        };
      } else {
        // No halant → finalize current akshara first, start new one
        const akshara = finalizeBuilder(prev);
        setBoxes((bx) => {
          const next = [...bx];
          next[activeBox] = akshara;
          return next;
        });
        setActiveBox((ab) => {
          const nextBox = Math.min(ab + 1, WORD_LENGTH);
          return nextBox;
        });
        return {
          consonants: [char],
          vowelSign: null,
          pendingHalant: false,
        };
      }
    });
  }

  // ── Vowel sign pressed ─────────────────────────────────────────────────────
  function handleVowelSign(sign: string) {
    if (activeBox >= WORD_LENGTH) return;

    if (sign === HALANT) {
      // Halant: mark pending (next consonant will be joined into cluster)
      if (builder.consonants.length === 0) {
        showHint("Pick a consonant first, then apply ్");
        return;
      }
      setBuilder((prev) => ({ ...prev, pendingHalant: true, vowelSign: null }));
      return;
    }

    // Regular vowel sign: attach and finalize
    if (builder.consonants.length === 0) {
      showHint("Pick a consonant first, then a vowel sign");
      return;
    }
    const finalized = { ...builder, vowelSign: sign, pendingHalant: false };
    commitBuilder(finalized, activeBox);
  }

  // ── Next / confirm button ──────────────────────────────────────────────────
  function handleNext() {
    if (builder.consonants.length === 0) {
      showHint("Type a consonant first!");
      return;
    }
    commitBuilder({ ...builder, pendingHalant: false }, activeBox);
  }

  // ── Backspace ──────────────────────────────────────────────────────────────
  function handleBackspace() {
    // If there's something in the builder, undo within builder first
    if (builder.pendingHalant) {
      setBuilder((prev) => ({ ...prev, pendingHalant: false }));
      return;
    }
    if (builder.vowelSign) {
      setBuilder((prev) => ({ ...prev, vowelSign: null }));
      return;
    }
    if (builder.consonants.length > 1) {
      setBuilder((prev) => ({
        ...prev,
        consonants: prev.consonants.slice(0, -1),
        pendingHalant: false,
      }));
      return;
    }
    if (builder.consonants.length === 1) {
      setBuilder(emptyBuilder());
      return;
    }
    // Builder is empty — go back to previous box
    if (activeBox > 0) {
      const prevBox = activeBox - 1;
      setActiveBox(prevBox);
      setBoxes((prev) => {
        const next = [...prev];
        next[prevBox] = "";
        return next;
      });
    }
  }

  // ── Full reset ─────────────────────────────────────────────────────────────
  function handleReset() {
    setBoxes(Array(WORD_LENGTH).fill(""));
    setBuilder(emptyBuilder());
    setActiveBox(0);
    setHint(null);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    // Finalize any pending builder first
    let finalBoxes = [...boxes];
    let curBox = activeBox;
    if (builder.consonants.length > 0 && curBox < WORD_LENGTH) {
      finalBoxes[curBox] = finalizeBuilder({ ...builder, pendingHalant: false });
      curBox++;
    }
    const filled = finalBoxes.filter(Boolean).length;
    if (filled < WORD_LENGTH) {
      showHint(`Fill all ${WORD_LENGTH} aksharas first!`);
      return;
    }
    const word = finalBoxes.join("");
    showHint(`✓ submitted: ${word}`);
  }

  // ── Derived display ────────────────────────────────────────────────────────
  const builderDisplay = renderBuilder(builder);
  const isBuilding = builder.consonants.length > 0;
  const isPendingHalant = builder.pendingHalant;

  return (
    <div
      className="min-h-screen flex flex-col items-center select-none"
      style={{
        background: "linear-gradient(160deg, #1a0a2e 0%, #16213e 60%, #0f3460 100%)",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div className="w-full flex items-center justify-between px-5 pt-10 pb-3">
        <div>
          <h1
            className="text-2xl font-bold text-amber-300 tracking-wide"
            style={{ fontFamily: "serif" }}
          >
            తెలుగు పదం
          </h1>
          <p className="text-xs text-indigo-300 mt-0.5 tracking-widest uppercase">
            Telugu Word Game
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-indigo-300">4 aksharas</span>
          <div className="flex gap-1">
            {Array.from({ length: WORD_LENGTH }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: boxes[i]
                    ? "#f59e0b"
                    : i === activeBox
                    ? "#818cf8"
                    : "#3b4568",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="w-full h-px"
        style={{ background: "linear-gradient(90deg, transparent, #7c3aed44, transparent)" }}
      />

      {/* ── Hint toast ── */}
      <div
        className="w-full px-5 overflow-hidden transition-all duration-300"
        style={{ height: hint ? 36 : 0, opacity: hint ? 1 : 0 }}
      >
        <div
          className="mt-2 px-3 py-1 rounded-lg text-xs text-center"
          style={{ background: "rgba(99,102,241,0.25)", color: "#a5b4fc" }}
        >
          {hint}
        </div>
      </div>

      {/* ── Guess area ── */}
      <div className="w-full px-5 pt-4 pb-2">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-3 text-center">
          మీ అంచనా · Your Guess
        </p>
        <div className="flex gap-3 justify-center">
          {Array.from({ length: WORD_LENGTH }).map((_, i) => {
            const committed = boxes[i];
            const isActive = i === activeBox;
            const displayChar = isActive && isBuilding ? builderDisplay : committed;
            const isEmpty = !displayChar;
            return (
              <button
                key={i}
                onClick={() => {
                  if (i < activeBox) {
                    // Allow clicking back to re-edit a committed box
                    setActiveBox(i);
                    setBuilder(emptyBuilder());
                  }
                }}
                className="relative flex items-center justify-center rounded-2xl font-bold transition-all duration-200"
                style={{
                  width: 70,
                  height: 76,
                  fontSize: displayChar && displayChar.length > 2 ? "1.2rem" : "1.9rem",
                  background: isActive
                    ? "linear-gradient(135deg, #312e81, #4338ca)"
                    : committed
                    ? "linear-gradient(135deg, #1e3a5f, #1e40af)"
                    : "rgba(255,255,255,0.05)",
                  border: isActive
                    ? "2px solid #818cf8"
                    : committed
                    ? "2px solid #3b82f6"
                    : "2px solid rgba(255,255,255,0.12)",
                  color:
                    isActive && isPendingHalant
                      ? "#fbbf24"
                      : isActive
                      ? "#e0e7ff"
                      : "#c7d2fe",
                  boxShadow: isActive
                    ? "0 0 20px rgba(129,140,248,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : committed
                    ? "0 4px 12px rgba(59,130,246,0.2)"
                    : "none",
                }}
              >
                {isEmpty ? (
                  <span
                    style={{
                      width: 24,
                      height: 3,
                      background: isActive ? "#818cf8" : "rgba(255,255,255,0.2)",
                      borderRadius: 4,
                      display: "block",
                    }}
                  />
                ) : (
                  displayChar
                )}
                {isActive && (
                  <span
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse"
                    style={{ background: isPendingHalant ? "#fbbf24" : "#818cf8" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Builder status line */}
        <div className="text-center mt-2" style={{ height: 18 }}>
          {isBuilding && (
            <p className="text-xs" style={{ color: "#7c3aed" }}>
              {isPendingHalant
                ? "🔗 Halant applied — now pick the next consonant to join"
                : `Building akshara: ${builderDisplay} — tap ్ to cluster or a vowel to finish`}
            </p>
          )}
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex gap-2 mt-1 mb-3">
        <button
          onClick={handleBackspace}
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{
            background: "rgba(239,68,68,0.15)",
            color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          ← చెరిపు
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          మళ్ళీ
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{
            background: "rgba(99,102,241,0.25)",
            color: "#a5b4fc",
            border: "1px solid rgba(99,102,241,0.4)",
          }}
        >
          తర్వాత →
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #d97706, #f59e0b)",
            color: "#1c1917",
            border: "none",
          }}
        >
          ✓ సమర్పించు
        </button>
      </div>

      {/* ── Secret Scroll — Vowel Signs ── */}
      <div className="w-full mb-2">
        <div className="flex items-center px-5 mb-2 gap-2">
          <div className="h-px flex-1" style={{ background: "rgba(99,102,241,0.2)" }} />
          <p className="text-xs text-indigo-400 uppercase tracking-widest whitespace-nowrap px-2">
            🔮 రహస్య చుట్టు · Secret Scroll
          </p>
          <div className="h-px flex-1" style={{ background: "rgba(99,102,241,0.2)" }} />
        </div>
        <div
          className="flex gap-2 overflow-x-auto px-5 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {VOWEL_SIGNS.map(({ sign, label }) => {
            const isHalant = sign === HALANT;
            const isActive = isHalant ? isPendingHalant : builder.vowelSign === sign;
            return (
              <button
                key={sign}
                onClick={() => handleVowelSign(sign)}
                className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl transition-all duration-150 active:scale-90"
                style={{
                  width: 58,
                  height: 62,
                  background: isActive
                    ? isHalant
                      ? "linear-gradient(135deg, #92400e, #d97706)"
                      : "linear-gradient(135deg, #1d4ed8, #2563eb)"
                    : isHalant
                    ? "linear-gradient(135deg, rgba(217,119,6,0.2), rgba(217,119,6,0.1))"
                    : "linear-gradient(135deg, rgba(29,78,216,0.2), rgba(37,99,235,0.1))",
                  border: isActive
                    ? isHalant
                      ? "2px solid #fbbf24"
                      : "2px solid #60a5fa"
                    : isHalant
                    ? "2px solid rgba(217,119,6,0.4)"
                    : "2px solid rgba(59,130,246,0.3)",
                  boxShadow: isActive
                    ? isHalant
                      ? "0 0 16px rgba(251,191,36,0.5)"
                      : "0 0 16px rgba(96,165,250,0.5)"
                    : "none",
                }}
              >
                <span
                  className="font-bold leading-none"
                  style={{
                    fontSize: "1.35rem",
                    color: isActive
                      ? isHalant
                        ? "#fef3c7"
                        : "#bfdbfe"
                      : isHalant
                      ? "#fbbf24"
                      : "#93c5fd",
                  }}
                >
                  {isHalant ? "క" + HALANT : "క" + sign}
                </span>
                <span
                  className="mt-0.5"
                  style={{
                    fontSize: 9,
                    color: isActive ? (isHalant ? "#fde68a" : "#93c5fd") : "#4b7fa8",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Consonant Keyboard ── */}
      <div className="w-full px-4 pb-6">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-2 text-center">
          హల్లులు · Consonants
        </p>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {CONSONANTS.map((char) => (
            <button
              key={char}
              onClick={() => handleConsonant(char)}
              className="flex items-center justify-center rounded-2xl text-2xl font-bold transition-all duration-100 active:scale-90"
              style={{
                height: 58,
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                border: "1.5px solid rgba(255,255,255,0.14)",
                color: "#e2e8f0",
                boxShadow:
                  "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="pb-6 px-5 text-center">
        <p className="text-xs" style={{ color: "rgba(148,163,184,0.45)" }}>
          Tip: try రాష్ట్రపతి — ర+ా → ష + ్(halant) + ట + ్(halant) + ర → ప → త+ి
        </p>
      </div>
    </div>
  );
}
