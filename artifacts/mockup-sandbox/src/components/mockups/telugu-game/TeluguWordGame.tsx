import { useState, useRef } from "react";

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
  { sign: "్", label: "hal" },
  { sign: "ం", label: "am" },
  { sign: "ః", label: "ah" },
];

const CONSONANTS = [
  "క", "ఖ", "గ", "ఘ", "ఙ",
  "చ", "ఛ", "జ", "ఝ", "ఞ",
  "ట", "ఠ", "డ", "ఢ", "ణ",
  "త", "థ", "ద", "ధ", "న",
  "ప", "ఫ", "బ", "భ", "మ",
  "య", "ర", "ల", "వ", "శ",
];

const WORD_LENGTH = 4;

export default function TeluguWordGame() {
  const [guessBoxes, setGuessBoxes] = useState<string[]>(Array(WORD_LENGTH).fill(""));
  const [activeBox, setActiveBox] = useState<number>(0);
  const [activeVowel, setActiveVowel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleConsonant(char: string) {
    if (activeBox >= WORD_LENGTH) return;
    const next = [...guessBoxes];
    next[activeBox] = char + (activeVowel ?? "");
    setGuessBoxes(next);
    setActiveVowel(null);
    setActiveBox((prev) => Math.min(prev + 1, WORD_LENGTH));
  }

  function handleVowel(sign: string) {
    setActiveVowel((prev) => (prev === sign ? null : sign));
  }

  function handleClear() {
    const prev = activeBox > 0 ? activeBox - 1 : 0;
    const next = [...guessBoxes];
    next[prev] = "";
    setGuessBoxes(next);
    setActiveBox(prev);
    setActiveVowel(null);
  }

  function handleReset() {
    setGuessBoxes(Array(WORD_LENGTH).fill(""));
    setActiveBox(0);
    setActiveVowel(null);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "linear-gradient(160deg, #1a0a2e 0%, #16213e 60%, #0f3460 100%)" }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-300 tracking-wide" style={{ fontFamily: "serif" }}>
            తెలుగు పదం
          </h1>
          <p className="text-xs text-indigo-300 mt-0.5 tracking-widest uppercase">Word Game</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-indigo-300">Day 42</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: i === 1 ? "#f59e0b" : "#3b4568" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px" style={{ background: "linear-gradient(90deg, transparent, #7c3aed44, transparent)" }} />

      {/* Guess Area */}
      <div className="w-full px-5 pt-6 pb-2">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-3 text-center">
          మీ అంచనా · Your Guess
        </p>
        <div className="flex gap-3 justify-center">
          {guessBoxes.map((char, i) => (
            <button
              key={i}
              onClick={() => setActiveBox(i)}
              className="relative flex items-center justify-center rounded-2xl text-3xl font-bold transition-all duration-200"
              style={{
                width: 72,
                height: 80,
                background:
                  i === activeBox
                    ? "linear-gradient(135deg, #312e81, #4338ca)"
                    : char
                    ? "linear-gradient(135deg, #1e3a5f, #1e40af)"
                    : "rgba(255,255,255,0.05)",
                border:
                  i === activeBox
                    ? "2px solid #818cf8"
                    : char
                    ? "2px solid #3b82f6"
                    : "2px solid rgba(255,255,255,0.12)",
                color: "#e0e7ff",
                boxShadow:
                  i === activeBox
                    ? "0 0 20px rgba(129,140,248,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : char
                    ? "0 4px 12px rgba(59,130,246,0.2)"
                    : "none",
              }}
            >
              {char || (
                <span
                  style={{
                    width: 28,
                    height: 3,
                    background:
                      i === activeBox
                        ? "#818cf8"
                        : "rgba(255,255,255,0.2)",
                    borderRadius: 4,
                    display: "block",
                  }}
                />
              )}
              {i === activeBox && (
                <span
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 animate-pulse"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-3 mb-1">
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          ← చెరిపు
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          మళ్ళీ
        </button>
        <button
          className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#1c1917", border: "none" }}
        >
          సమర్పించు ✓
        </button>
      </div>

      {/* Secret Scroll — Vowel Signs */}
      <div className="w-full mt-4 mb-2">
        <div className="flex items-center px-5 mb-2 gap-2">
          <div className="h-px flex-1" style={{ background: "rgba(99,102,241,0.2)" }} />
          <p className="text-xs text-indigo-400 uppercase tracking-widest whitespace-nowrap px-2">
            🔮 రహస్య చుట్టు · Secret Scroll
          </p>
          <div className="h-px flex-1" style={{ background: "rgba(99,102,241,0.2)" }} />
        </div>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-5 pb-1 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {VOWEL_SIGNS.map(({ sign, label }) => {
            const isActive = activeVowel === sign;
            return (
              <button
                key={sign}
                onClick={() => handleVowel(sign)}
                className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl transition-all duration-150 active:scale-90"
                style={{
                  width: 58,
                  height: 62,
                  background: isActive
                    ? "linear-gradient(135deg, #1d4ed8, #2563eb)"
                    : "linear-gradient(135deg, rgba(29,78,216,0.2), rgba(37,99,235,0.1))",
                  border: isActive
                    ? "2px solid #60a5fa"
                    : "2px solid rgba(59,130,246,0.3)",
                  boxShadow: isActive
                    ? "0 0 16px rgba(96,165,250,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "none",
                }}
              >
                <span
                  className="text-2xl font-bold leading-none"
                  style={{ color: isActive ? "#bfdbfe" : "#93c5fd" }}
                >
                  క{sign}
                </span>
                <span
                  className="text-xs mt-1"
                  style={{ color: isActive ? "#93c5fd" : "#4b7fa8", fontSize: 9 }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consonant Keyboard */}
      <div className="w-full px-4 mt-3">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-3 text-center">
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
              className="flex items-center justify-center rounded-2xl text-2xl font-bold transition-all duration-100 active:scale-90 select-none"
              style={{
                height: 60,
                background: "linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                border: "1.5px solid rgba(255,255,255,0.14)",
                color: "#e2e8f0",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                backdropFilter: "blur(4px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "linear-gradient(160deg, rgba(139,92,246,0.4) 0%, rgba(99,102,241,0.3) 100%)";
                (e.currentTarget as HTMLButtonElement).style.border = "1.5px solid rgba(139,92,246,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)";
                (e.currentTarget as HTMLButtonElement).style.border = "1.5px solid rgba(255,255,255,0.14)";
              }}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="mt-auto pt-4 pb-6 text-center">
        <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
          Tap a consonant + vowel sign to form a syllable
        </p>
      </div>
    </div>
  );
}
