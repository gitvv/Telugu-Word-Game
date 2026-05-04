import { useState, useRef } from "react";

// ─── Telugu data ──────────────────────────────────────────────────────────────

const HALANT = "్";
const ANUSVARA = "ం";
const RRUKAR = "ృ";

// Independent vowels (standalone — fill box directly)
const INDEPENDENT_VOWELS = new Set([
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
]);

// Non-advancing modifiers: attach to current box without moving cursor
const NON_ADVANCING_MODIFIERS = new Set([ANUSVARA, RRUKAR]);

// Dependent vowel signs (matras) — used when parsing a committed akshara for deletion
const DEPENDENT_VOWEL_SIGNS = new Set([
  "ా", "ి", "ీ", "ు", "ూ", RRUKAR, "ె", "ే", "ై", "ొ", "ో", "ౌ",
]);

const MODIFIER_SHELF = [
  // Independent vowels
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
  // The Bridge
  ANUSVARA,
  // Dependent vowel signs (ృ between ూ and ె)
  "ా", "ి", "ీ", "ు", "ూ", RRUKAR, "ె", "ే", "ై", "ొ", "ో", "ౌ",
  // The Glue
  HALANT,
];

// 7 rows × 5 columns
const CONSONANT_ROWS = [
  ["క", "ఖ", "గ", "ఘ", "ఙ"],
  ["చ", "ఛ", "జ", "ఝ", "ఞ"],
  ["ట", "ఠ", "డ", "ఢ", "ణ"],
  ["త", "థ", "ద", "ధ", "న"],
  ["ప", "ఫ", "బ", "భ", "మ"],
  ["య", "ర", "ల", "వ", "శ"],
  ["ష", "స", "హ", "ళ", "ఱ"],
];

const WORD_LENGTH = 4;

// ─── Akshara builder ──────────────────────────────────────────────────────────

interface AksharaBuilder {
  consonants: string[];
  vowelSign: string | null;
  pendingHalant: boolean;
}

const emptyBuilder = (): AksharaBuilder => ({
  consonants: [],
  vowelSign: null,
  pendingHalant: false,
});

function renderBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  const cluster = b.consonants.join(HALANT);
  return cluster + (b.pendingHalant ? HALANT : "") + (b.vowelSign ?? "");
}

function finalizeBuilder(b: AksharaBuilder): string {
  if (b.consonants.length === 0) return "";
  return b.consonants.join(HALANT) + (b.vowelSign ?? "");
}

// Parse a committed akshara string back into an AksharaBuilder for step-by-step deletion.
// Strips the trailing vowel sign (if any) or anusvara, then splits the rest by halant.
function reopenCommitted(s: string): AksharaBuilder {
  const codePoints = [...s]; // spread respects Unicode scalar values
  const last = codePoints[codePoints.length - 1];
  let vowelSign: string | null = null;
  let base = s;
  if (DEPENDENT_VOWEL_SIGNS.has(last)) {
    vowelSign = last;
    base = codePoints.slice(0, -1).join("");
  } else if (last === ANUSVARA) {
    base = codePoints.slice(0, -1).join(""); // strip ం; no vowelSign
  }
  const consonants = base.split(HALANT).filter(Boolean);
  return { consonants, vowelSign, pendingHalant: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Game() {
  const [boxes, setBoxes] = useState<string[]>(Array(WORD_LENGTH).fill(""));
  const [activeBox, setActiveBox] = useState(0);
  const [builder, setBuilder] = useState<AksharaBuilder>(emptyBuilder());
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to true when user explicitly clicks a box to edit it.
  // Lets handleConsonant overwrite in-place rather than advancing (ం behaviour).
  const explicitNavRef = useRef(false);

  function toast(msg: string) {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(msg);
    hintTimer.current = setTimeout(() => setHint(null), 2000);
  }

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

  function commitString(str: string, box: number) {
    setBoxes((prev) => {
      const next = [...prev];
      next[box] = str;
      return next;
    });
    setBuilder(emptyBuilder());
    setActiveBox(Math.min(box + 1, WORD_LENGTH));
  }

  // ── Consonant ──────────────────────────────────────────────────────────────
  function handleConsonant(char: string) {
    const wasExplicitNav = explicitNavRef.current;
    explicitNavRef.current = false;

    // Case A: builder empty but active box already committed
    if (builder.consonants.length === 0 && boxes[activeBox]) {
      if (wasExplicitNav) {
        // User explicitly clicked this box to edit — clear it and overwrite in-place
        setBoxes((bx) => { const nx = [...bx]; nx[activeBox] = ""; return nx; });
        setBuilder({ consonants: [char], vowelSign: null, pendingHalant: false });
      } else {
        // Cursor landed here via ం (no-advance) — advance to next box
        const next = activeBox + 1;
        if (next >= WORD_LENGTH) { toast("All boxes filled — submit or backspace!"); return; }
        setActiveBox(next);
        setBuilder({ consonants: [char], vowelSign: null, pendingHalant: false });
      }
      return;
    }

    if (activeBox >= WORD_LENGTH) { toast("All boxes filled — submit or backspace!"); return; }

    // Case B: start new akshara or extend a pending halant cluster
    if (builder.consonants.length === 0 || builder.pendingHalant) {
      setBuilder((prev) => ({ consonants: [...prev.consonants, char], vowelSign: null, pendingHalant: false }));
      return;
    }

    // Case C: builder has consonants with no pending halant → finalize current, start next
    const akshara = finalizeBuilder(builder);
    setBoxes((bx) => { const nx = [...bx]; nx[activeBox] = akshara; return nx; });
    setActiveBox((ab) => Math.min(ab + 1, WORD_LENGTH));
    setBuilder({ consonants: [char], vowelSign: null, pendingHalant: false });
  }

  // ── Modifier shelf ─────────────────────────────────────────────────────────
  function handleModifier(char: string) {
    // ── Anusvara: universal modifier — attaches to active box, no cursor advance
    // ── Non-advancing modifiers: ం (anusvara) and ృ (rrukar) ──────────────────
    if (NON_ADVANCING_MODIFIERS.has(char)) {
      if (builder.consonants.length > 0) {
        // ృ acts as a vowel sign on the consonant cluster (కృ);
        // ం appends after the finalized akshara (కం)
        const akshara = char === RRUKAR
          ? finalizeBuilder({ ...builder, vowelSign: RRUKAR, pendingHalant: false })
          : finalizeBuilder({ ...builder, pendingHalant: false }) + char;
        setBoxes((prev) => { const next = [...prev]; next[activeBox] = akshara; return next; });
        setBuilder(emptyBuilder());
        return; // Do NOT advance activeBox
      }
      // Active box already committed → append, stay
      if (boxes[activeBox]) {
        setBoxes((prev) => { const next = [...prev]; next[activeBox] += char; return next; });
        return;
      }
      // Active box empty → go back and append to the previous box
      if (activeBox > 0) {
        setBoxes((prev) => { const next = [...prev]; next[activeBox - 1] += char; return next; });
        return;
      }
      toast(`Nothing to attach ${char} to yet!`);
      return;
    }

    if (activeBox >= WORD_LENGTH) { toast("All boxes filled!"); return; }

    if (INDEPENDENT_VOWELS.has(char)) {
      // Independent vowel — fills box directly (finalize any pending builder first)
      if (builder.consonants.length > 0) {
        commitBuilder(builder, activeBox);
        toast(`Committed current akshara — tap ${char} again to place it`);
        return;
      }
      commitString(char, activeBox);
      return;
    }

    if (char === HALANT) {
      if (builder.consonants.length === 0) {
        // Re-open a committed box: pull its consonants back into the builder
        if (boxes[activeBox]) {
          const parts = boxes[activeBox].split(HALANT);
          setBoxes((bx) => { const nx = [...bx]; nx[activeBox] = ""; return nx; });
          setBuilder({ consonants: parts, vowelSign: null, pendingHalant: true });
          return;
        }
        toast("Pick a consonant first, then ్");
        return;
      }
      setBuilder((prev) => ({ ...prev, pendingHalant: true, vowelSign: null }));
      return;
    }

    // Dependent vowel sign (matra)
    if (builder.consonants.length === 0) { toast("Pick a consonant first!"); return; }
    commitBuilder({ ...builder, vowelSign: char, pendingHalant: false }, activeBox);
  }

  // ── క్ష special key ────────────────────────────────────────────────────────
  function handleKsha() {
    if (activeBox >= WORD_LENGTH) { toast("All boxes filled!"); return; }
    if (builder.consonants.length > 0 && !builder.pendingHalant) {
      // Finalize current first
      commitBuilder(builder, activeBox);
      toast("Committed — now tap క్ష again");
      return;
    }
    // Start a క్ష cluster (or extend if halant pending)
    setBuilder((prev) => ({
      consonants: [...prev.consonants, "క", "ష"],
      vowelSign: null,
      pendingHalant: false,
    }));
  }

  // ── Backspace ──────────────────────────────────────────────────────────────
  function handleBackspace() {
    if (builder.pendingHalant) { setBuilder((p) => ({ ...p, pendingHalant: false })); return; }
    if (builder.vowelSign)     { setBuilder((p) => ({ ...p, vowelSign: null })); return; }
    if (builder.consonants.length > 1) {
      setBuilder((p) => ({ ...p, consonants: p.consonants.slice(0, -1), pendingHalant: false }));
      return;
    }
    if (builder.consonants.length === 1) { setBuilder(emptyBuilder()); return; }
    // Builder fully empty — find the right box to peel.
    // If activeBox is past the array (all boxes filled) or the current box is empty,
    // step back to the previous box first.
    let targetBox = activeBox;
    if (!boxes[targetBox]) {
      if (targetBox <= 0) return;
      targetBox = targetBox - 1;
      setActiveBox(targetBox);
    }
    if (!boxes[targetBox]) return;
    const content = boxes[targetBox];
    // Bare single code-point (e.g. plain "ప") — clear in one step
    if ([...content].length === 1) {
      setBoxes((bx) => { const nx = [...bx]; nx[targetBox] = ""; return nx; });
      return;
    }
    // Complex akshara — re-open into builder and peel one layer
    const reopened = reopenCommitted(content);
    setBoxes((bx) => { const nx = [...bx]; nx[targetBox] = ""; return nx; });
    if (reopened.vowelSign) {
      setBuilder({ ...reopened, vowelSign: null });
    } else {
      setBuilder({
        consonants: reopened.consonants.length > 1
          ? reopened.consonants.slice(0, -1)
          : reopened.consonants,
        vowelSign: null,
        pendingHalant: false,
      });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    let finalBoxes = [...boxes];
    let cur = activeBox;
    if (builder.consonants.length > 0 && cur < WORD_LENGTH) {
      finalBoxes[cur] = finalizeBuilder({ ...builder, pendingHalant: false });
      cur++;
    }
    if (finalBoxes.filter(Boolean).length < WORD_LENGTH) { toast("Fill all 4 aksharas first!"); return; }
    toast(`✓ సమర్పించారు: ${finalBoxes.join("")}`);
  }

  // ── Derived display ────────────────────────────────────────────────────────
  const builderDisplay = renderBuilder(builder);
  const isBuilding = builder.consonants.length > 0;
  const isPendingHalant = builder.pendingHalant;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(160deg,#1a0a2e 0%,#16213e 55%,#0f3460 100%)",
        maxWidth: 480,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      {/* ── Guess Area ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
        {/* Hint bar */}
        <div
          style={{
            height: hint ? 30 : 0,
            overflow: "hidden",
            transition: "height 0.2s",
            marginBottom: hint ? 6 : 0,
          }}
        >
          <div
            style={{
              background: "rgba(99,102,241,0.25)",
              color: "#a5b4fc",
              borderRadius: 8,
              fontSize: 11,
              textAlign: "center",
              padding: "4px 8px",
            }}
          >
            {hint}
          </div>
        </div>

        {/* 4 boxes */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {Array.from({ length: WORD_LENGTH }).map((_, i) => {
            const committed = boxes[i];
            const isActive = i === activeBox;
            const display = isActive && isBuilding ? builderDisplay : committed;
            const empty = !display;
            const charLen = display ? [...new Intl.Segmenter().segment(display)].length : 0;

            return (
              <button
                key={i}
                onClick={() => {
                  // Auto-commit any in-progress builder before jumping to another box
                  if (i !== activeBox && builder.consonants.length > 0 && activeBox < WORD_LENGTH) {
                    const akshara = finalizeBuilder({ ...builder, pendingHalant: false });
                    setBoxes(bx => { const nx = [...bx]; nx[activeBox] = akshara; return nx; });
                  }
                  explicitNavRef.current = true;
                  setActiveBox(i);
                  setBuilder(emptyBuilder());
                }}
                style={{
                  width: 72,
                  height: 76,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: charLen > 3 ? "1rem" : charLen > 2 ? "1.3rem" : "1.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  position: "relative",
                  transition: "all 0.18s",
                  background: isActive
                    ? "linear-gradient(135deg,#312e81,#4338ca)"
                    : committed
                    ? "linear-gradient(135deg,#1e3a5f,#1e40af)"
                    : "rgba(255,255,255,0.05)",
                  border: `2px solid ${isActive ? "#818cf8" : committed ? "#3b82f6" : "rgba(255,255,255,0.12)"}`,
                  color: isActive && isPendingHalant ? "#fbbf24" : "#e0e7ff",
                  boxShadow: isActive
                    ? "0 0 20px rgba(129,140,248,0.4)"
                    : committed
                    ? "0 4px 12px rgba(59,130,246,0.2)"
                    : "none",
                }}
              >
                {empty ? (
                  <span
                    style={{
                      display: "block",
                      width: 22,
                      height: 3,
                      borderRadius: 4,
                      background: isActive ? "#818cf8" : "rgba(255,255,255,0.18)",
                    }}
                  />
                ) : display}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isPendingHalant ? "#fbbf24" : "#818cf8",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Builder status */}
        <div style={{ height: 16, textAlign: "center", marginTop: 4 }}>
          {isBuilding && (
            <p style={{ fontSize: 10, color: "#7c3aed", margin: 0 }}>
              {isPendingHalant
                ? "🔗 Halant — pick next consonant to cluster"
                : `Building: ${builderDisplay} — add ్ to cluster, or pick a vowel to finish`}
            </p>
          )}
        </div>
      </div>

      {/* ── Modifier Shelf ──────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: 6 }}>
        {/* Label */}
        <p
          style={{
            fontSize: 9,
            textAlign: "center",
            color: "rgba(165,180,252,0.5)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 4px",
          }}
        >
          అచ్చులు &amp; గుర్తులు · Vowels &amp; Signs
        </p>

        {/* Scroll container with fade masks */}
        <div style={{ position: "relative" }}>
          {/* Left fade */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 28,
              background: "linear-gradient(to right,#16213e,transparent)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
          {/* Right fade */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 28,
              background: "linear-gradient(to left,#0f3460,transparent)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              padding: "2px 16px 4px",
              scrollbarWidth: "none",
            }}
          >
            {MODIFIER_SHELF.map((char, idx) => {
              const isHalant = char === HALANT;
              const isVowel = INDEPENDENT_VOWELS.has(char);
              const isActive =
                isHalant ? isPendingHalant : builder.vowelSign === char;

              return (
                <button
                  key={`${char}-${idx}`}
                  onClick={() => handleModifier(char)}
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: isActive
                      ? isHalant
                        ? "linear-gradient(135deg,#92400e,#d97706)"
                        : "linear-gradient(135deg,#1d4ed8,#2563eb)"
                      : isHalant
                      ? "rgba(217,119,6,0.15)"
                      : isVowel
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(29,78,216,0.18)",
                    border: `1.5px solid ${
                      isActive
                        ? isHalant ? "#fbbf24" : "#60a5fa"
                        : isHalant
                        ? "rgba(217,119,6,0.4)"
                        : isVowel
                        ? "rgba(16,185,129,0.35)"
                        : "rgba(59,130,246,0.3)"
                    }`,
                    color: isActive
                      ? isHalant ? "#fef3c7" : "#bfdbfe"
                      : isHalant
                      ? "#fbbf24"
                      : isVowel
                      ? "#6ee7b7"
                      : "#93c5fd",
                    boxShadow: isActive
                      ? isHalant
                        ? "0 0 12px rgba(251,191,36,0.4)"
                        : "0 0 12px rgba(96,165,250,0.4)"
                      : "none",
                  }}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Consonant Grid ──────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: "0 10px",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
            gap: 6,
          }}
        >
          {CONSONANT_ROWS.map((row, ri) =>
            row.map((char) => (
              <button
                key={`${ri}-${char}`}
                onClick={() => handleConsonant(char)}
                style={{
                  height: 52,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.55rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background:
                    "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)",
                  border: "1.5px solid rgba(255,255,255,0.13)",
                  color: "#e2e8f0",
                  boxShadow:
                    "0 2px 6px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.07)",
                  transition: "background 0.1s, transform 0.1s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "linear-gradient(160deg,rgba(139,92,246,0.45) 0%,rgba(99,102,241,0.35) 100%)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)";
                }}
                onPointerUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }}
                onPointerLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }}
              >
                {char}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom Action Bar ───────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 10px 12px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 6,
        }}
      >
        {/* Enter */}
        <button
          onClick={handleSubmit}
          style={{
            height: 52,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
            cursor: "pointer",
            background: "linear-gradient(135deg,#d97706,#f59e0b)",
            border: "none",
            color: "#1c1917",
            boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; }}
          onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.03em" }}>ENTER</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.75 }}>సమర్పించు</span>
        </button>

        {/* క్ష */}
        <button
          onClick={handleKsha}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.35rem",
            fontWeight: 700,
            cursor: "pointer",
            background:
              "linear-gradient(160deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.06) 100%)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            color: "#e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)"; }}
          onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          క్ష
        </button>

        {/* Backspace */}
        <button
          onClick={handleBackspace}
          style={{
            height: 52,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
            cursor: "pointer",
            background: "rgba(239,68,68,0.14)",
            border: "1.5px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; }}
          onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⌫</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.75 }}>చెరిపివేయి</span>
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
