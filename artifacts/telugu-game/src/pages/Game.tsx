import { useState, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════
//  SWITCHBOARD — toggle features here
// ═══════════════════════════════════════════════════════════════════
const enableHeatmap = true;
const enableInk     = true;
const secretWord    = "రాష్ట్రపతి";

// ═══════════════════════════════════════════════════════════════════
//  INK COSTS
// ═══════════════════════════════════════════════════════════════════
const INK = { consonant: 2, vowelSign: 3, halant: 5, anusvara: 3 };

// ═══════════════════════════════════════════════════════════════════
//  TELUGU UNICODE HELPERS
// ═══════════════════════════════════════════════════════════════════
const HALANT   = "\u0C4D"; // ్
const ANUSVARA = "\u0C02"; // ం

function isConsonant(c: string)      { const n = c.charCodeAt(0); return n >= 0x0C15 && n <= 0x0C39; }
function isMatra(c: string)          { const n = c.charCodeAt(0); return (n >= 0x0C3E && n <= 0x0C4C) || n === 0x0C62 || n === 0x0C63; }
function isIndepVowel(c: string)     { const n = c.charCodeAt(0); return n >= 0x0C05 && n <= 0x0C14; }

/** Split a Telugu word string into individual aksharas. */
function splitAksharas(word: string): string[] {
  const chars  = [...word];
  const result: string[] = [];
  let   cur    = "";

  for (const c of chars) {
    if (isConsonant(c)) {
      // If the last character was NOT a halant, the previous akshara is complete
      const lastWasHalant = cur.length > 0 && cur[cur.length - 1] === HALANT;
      if (cur.length > 0 && !lastWasHalant) { result.push(cur); cur = ""; }
      cur += c;
    } else if (c === HALANT) {
      cur += c;
    } else if (isMatra(c) || c === ANUSVARA || c.charCodeAt(0) === 0x0C03 /* ః */) {
      cur += c;
      result.push(cur); cur = "";
    } else if (isIndepVowel(c)) {
      if (cur) { result.push(cur); cur = ""; }
      result.push(c);
    }
  }
  if (cur) result.push(cur);
  return result;
}

/** Return the first consonant in an akshara (for varga matching). */
function baseConsonant(akshara: string): string {
  for (const c of akshara) if (isConsonant(c)) return c;
  return "";
}

// ═══════════════════════════════════════════════════════════════════
//  STATIC DATA
// ═══════════════════════════════════════════════════════════════════
const MODIFIER_SHELF = [
  "అ","ఆ","ఇ","ఈ","ఉ","ఊ","ఎ","ఏ","ఐ","ఒ","ఓ","ఔ", // independent vowels
  ANUSVARA,                                             // the bridge
  "ా","ి","ీ","ు","ూ","ె","ే","ై","ొ","ో","ౌ",        // dependent signs
  HALANT,                                               // the glue
];

const CONSONANT_ROWS = [
  ["క","ఖ","గ","ఘ","ఙ"],
  ["చ","ఛ","జ","ఝ","ఞ"],
  ["ట","ఠ","డ","ఢ","ణ"],
  ["త","థ","ద","ధ","న"],
  ["ప","ఫ","బ","భ","మ"],
  ["య","ర","ల","వ","శ"],
  ["ష","స","హ","ళ","ఱ"],
];

const WORD_LENGTH = 4;

// ═══════════════════════════════════════════════════════════════════
//  AKSHARA BUILDER
// ═══════════════════════════════════════════════════════════════════
interface Builder { consonants: string[]; vowelSign: string | null; pendingHalant: boolean; }
const mkBuilder = (): Builder => ({ consonants: [], vowelSign: null, pendingHalant: false });

function renderBuilder(b: Builder): string {
  if (!b.consonants.length) return "";
  return b.consonants.join(HALANT) + (b.pendingHalant ? HALANT : "") + (b.vowelSign ?? "");
}
function finalizeBuilder(b: Builder): string {
  if (!b.consonants.length) return "";
  return b.consonants.join(HALANT) + (b.vowelSign ?? "");
}

// ═══════════════════════════════════════════════════════════════════
//  RESULT TYPES
// ═══════════════════════════════════════════════════════════════════
type Color = "green" | "yellow" | "gray" | null;

const BOX_RESULT_STYLE: Record<NonNullable<Color>, { bg: string; border: string; shadow: string }> = {
  green:  { bg: "linear-gradient(135deg,#14532d,#166534)",  border: "#22c55e", shadow: "0 0 18px rgba(34,197,94,0.45)"  },
  yellow: { bg: "linear-gradient(135deg,#78350f,#92400e)",  border: "#fbbf24", shadow: "0 0 18px rgba(251,191,36,0.45)" },
  gray:   { bg: "linear-gradient(135deg,#1e293b,#334155)",  border: "#475569", shadow: "none"                           },
};

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function Game() {

  // ── derived from secret word (stable) ──────────────────────────
  const secretAksharas = useMemo(() => splitAksharas(secretWord), []);
  const secretConsonants = useMemo(() =>
    new Set(secretAksharas.map(baseConsonant).filter(Boolean)), [secretAksharas]);

  // ── state ───────────────────────────────────────────────────────
  const [boxes,    setBoxes]    = useState<string[]>(Array(WORD_LENGTH).fill(""));
  const [active,   setActive]   = useState(0);
  const [builder,  setBuilder]  = useState<Builder>(mkBuilder());
  const [ink,      setInk]      = useState(100);
  const [results,  setResults]  = useState<Color[]>(Array(WORD_LENGTH).fill(null));
  const [rowState, setRowState] = useState<Record<number,"hot"|"cold"|"">>({}); // set after ENTER
  const [dryPen,   setDryPen]   = useState(false);
  const [hint,     setHint]     = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false); // true after ENTER, clears on next keystroke
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ─────────────────────────────────────────────────────
  function toast(msg: string) {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(msg);
    hintTimer.current = setTimeout(() => setHint(null), 2200);
  }

  function drainInk(cost: number) {
    if (!enableInk) return;
    setInk(prev => {
      const next = Math.max(0, prev - cost);
      if (next === 0) setDryPen(true);
      return next;
    });
  }

  /** Commit builder to the current box IN PLACE — no cursor advance. */
  function commitInPlace(b: Builder) {
    const akshara = finalizeBuilder({ ...b, pendingHalant: false });
    if (!akshara) return;
    setBoxes(prev => { const n = [...prev]; n[active] = akshara; return n; });
    setBuilder(mkBuilder());
  }

  /** Wipe revealed state on the next keystroke. */
  function clearRevealIfNeeded() {
    if (revealed) { setResults(Array(WORD_LENGTH).fill(null)); setRowState({}); setRevealed(false); }
  }

  // ── consonant key ───────────────────────────────────────────────
  function handleConsonant(char: string) {
    if (dryPen) return;
    clearRevealIfNeeded();
    if (active >= WORD_LENGTH) { toast("All boxes filled — hit ENTER or ⌫"); return; }
    drainInk(INK.consonant);

    setBuilder(prev => {
      const extending = prev.consonants.length === 0 || prev.pendingHalant;
      if (extending) {
        return { consonants: [...prev.consonants, char], vowelSign: null, pendingHalant: false };
      }
      // Existing akshara, no halant → commit it and start new box
      const akshara = finalizeBuilder(prev);
      setBoxes(bx => { const n = [...bx]; n[active] = akshara; return n; });
      setActive(a => Math.min(a + 1, WORD_LENGTH));
      return { consonants: [char], vowelSign: null, pendingHalant: false };
    });
  }

  // ── modifier shelf ──────────────────────────────────────────────
  function handleModifier(char: string) {
    if (dryPen) return;
    clearRevealIfNeeded();

    // ── Anusvara: attach to active box, NO advance ──────────────
    if (char === ANUSVARA) {
      drainInk(INK.anusvara);
      if (builder.consonants.length > 0) {
        const akshara = finalizeBuilder({ ...builder, pendingHalant: false }) + ANUSVARA;
        setBoxes(prev => { const n = [...prev]; n[active] = akshara; return n; });
        setBuilder(mkBuilder());
        return;
      }
      if (boxes[active]) {
        setBoxes(prev => { const n = [...prev]; n[active] += ANUSVARA; return n; });
        return;
      }
      if (active > 0) {
        setBoxes(prev => { const n = [...prev]; n[active - 1] += ANUSVARA; return n; });
        return;
      }
      toast("Nothing to attach ం to yet!");
      return;
    }

    if (active >= WORD_LENGTH) { toast("All boxes filled!"); return; }

    // ── Independent vowel: fill box, NO advance ─────────────────
    if (isIndepVowel(char)) {
      drainInk(INK.vowelSign);
      if (builder.consonants.length > 0) {
        commitInPlace(builder);
        toast(`Akshara committed — tap ${char} again to place`);
        return;
      }
      setBoxes(prev => { const n = [...prev]; n[active] = char; return n; });
      setBuilder(mkBuilder());
      return;
    }

    // ── Halant: mark pending ────────────────────────────────────
    if (char === HALANT) {
      if (!builder.consonants.length) { toast("Pick a consonant first, then ్"); return; }
      drainInk(INK.halant);
      setBuilder(prev => ({ ...prev, pendingHalant: true, vowelSign: null }));
      return;
    }

    // ── Matra (dependent vowel sign): attach, NO advance ────────
    if (!builder.consonants.length) { toast("Pick a consonant first!"); return; }
    drainInk(INK.vowelSign);
    commitInPlace({ ...builder, vowelSign: char });
  }

  // ── క్ష key ─────────────────────────────────────────────────────
  function handleKsha() {
    if (dryPen) return;
    clearRevealIfNeeded();
    if (active >= WORD_LENGTH) return;
    if (builder.consonants.length > 0 && !builder.pendingHalant) {
      commitInPlace(builder);
      toast("Committed — tap క్ష again");
      return;
    }
    drainInk(INK.consonant * 2);
    setBuilder(prev => ({ consonants: [...prev.consonants, "క", "ష"], vowelSign: null, pendingHalant: false }));
  }

  // ── backspace ───────────────────────────────────────────────────
  function handleBackspace() {
    clearRevealIfNeeded();
    if (builder.pendingHalant) { setBuilder(p => ({ ...p, pendingHalant: false })); return; }
    if (builder.vowelSign)     { setBuilder(p => ({ ...p, vowelSign: null })); return; }
    if (builder.consonants.length > 1) {
      setBuilder(p => ({ ...p, consonants: p.consonants.slice(0, -1), pendingHalant: false }));
      return;
    }
    if (builder.consonants.length === 1) { setBuilder(mkBuilder()); return; }
    if (boxes[active]) {
      // Strip last character from committed box (e.g. anusvara)
      const stripped = [...boxes[active]].slice(0, -1).join("");
      setBoxes(prev => { const n = [...prev]; n[active] = stripped; return n; });
      return;
    }
    if (active > 0) {
      const prev = active - 1;
      setActive(prev);
      setBoxes(bx => { const n = [...bx]; n[prev] = ""; return n; });
    }
  }

  // ── ENTER / submit ──────────────────────────────────────────────
  function handleSubmit() {
    // Commit any in-progress builder to active box first
    let finalBoxes = [...boxes];
    if (builder.consonants.length > 0 && active < WORD_LENGTH) {
      finalBoxes[active] = finalizeBuilder({ ...builder, pendingHalant: false });
      setBoxes(finalBoxes);
      setBuilder(mkBuilder());
    }

    if (finalBoxes.filter(Boolean).length < WORD_LENGTH) {
      toast("Fill all 4 aksharas first!");
      return;
    }

    if (enableHeatmap) {
      // Compute per-box colors
      const newResults: Color[] = finalBoxes.map((akshara, i) => {
        if (!akshara) return "gray";
        if (akshara === secretAksharas[i]) return "green";
        const base = baseConsonant(akshara);
        if (base && secretConsonants.has(base)) return "yellow";
        return "gray";
      });
      setResults(newResults);

      // Ink refill: +5% per green
      if (enableInk) {
        const greens = newResults.filter(r => r === "green").length;
        if (greens > 0) setInk(prev => Math.min(100, prev + greens * 5));
      }

      // Row glow
      const newRowState: Record<number, "hot" | "cold" | ""> = {};
      CONSONANT_ROWS.forEach((row, ri) => {
        const hasMatch = row.some(c => secretConsonants.has(c));
        newRowState[ri] = hasMatch ? "hot" : "cold";
      });
      setRowState(newRowState);
      setRevealed(true);
    } else {
      toast(`✓ సమర్పించారు: ${finalBoxes.join("")}`);
    }
  }

  // ── reset ───────────────────────────────────────────────────────
  function handleReset() {
    setBoxes(Array(WORD_LENGTH).fill(""));
    setActive(0);
    setBuilder(mkBuilder());
    setInk(100);
    setResults(Array(WORD_LENGTH).fill(null));
    setRowState({});
    setDryPen(false);
    setRevealed(false);
    setHint(null);
  }

  // ── derived display ─────────────────────────────────────────────
  const builderStr     = renderBuilder(builder);
  const isBuilding     = builder.consonants.length > 0;
  const isPendingHalant = builder.pendingHalant;
  const inkPct         = `${ink}%`;
  const inkColor       = ink > 50 ? "#a855f7" : ink > 25 ? "#f59e0b" : "#ef4444";

  // ═════════════════════════════════════════════════════════════════
  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg,#1a0a2e 0%,#16213e 55%,#0f3460 100%)",
      maxWidth: 480, margin: "0 auto", overflow: "hidden", position: "relative",
    }}>

      {/* ── INK BAR ──────────────────────────────────────────────── */}
      {enableInk && (
        <div style={{ flexShrink: 0, height: 4, background: "rgba(255,255,255,0.06)", position: "relative" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: inkPct,
            background: `linear-gradient(90deg, ${inkColor}, ${inkColor}aa)`,
            transition: "width 0.4s ease, background 0.4s ease",
            boxShadow: `0 0 8px ${inkColor}88`,
          }} />
        </div>
      )}

      {/* ── GUESS AREA ───────────────────────────────────────────── */}
      <div style={{ padding: "10px 16px 4px", flexShrink: 0 }}>
        {/* Hint */}
        <div style={{ height: hint ? 26 : 0, overflow: "hidden", transition: "height 0.2s", marginBottom: hint ? 4 : 0 }}>
          <div style={{ background: "rgba(99,102,241,0.22)", color: "#a5b4fc", borderRadius: 7, fontSize: 10.5, textAlign: "center", padding: "3px 8px" }}>
            {hint}
          </div>
        </div>

        {/* 4 boxes */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {Array.from({ length: WORD_LENGTH }).map((_, i) => {
            const committed  = boxes[i];
            const isActive   = i === active;
            const display    = isActive && isBuilding ? builderStr : committed;
            const empty      = !display;
            const charLen    = display?.length ?? 0;
            const result     = results[i];

            // Base style (overridden by result color)
            let bg     = isActive ? "linear-gradient(135deg,#312e81,#4338ca)" : committed ? "linear-gradient(135deg,#1e3a5f,#1e40af)" : "rgba(255,255,255,0.05)";
            let border = isActive ? "#818cf8" : committed ? "#3b82f6" : "rgba(255,255,255,0.12)";
            let shadow = isActive ? "0 0 20px rgba(129,140,248,0.4)" : committed ? "0 4px 12px rgba(59,130,246,0.2)" : "none";

            if (result && BOX_RESULT_STYLE[result]) {
              bg     = BOX_RESULT_STYLE[result].bg;
              border = BOX_RESULT_STYLE[result].border;
              shadow = BOX_RESULT_STYLE[result].shadow;
            }

            return (
              <button key={i}
                onClick={() => { if (i <= active) { setActive(i); setBuilder(mkBuilder()); clearRevealIfNeeded(); } }}
                style={{
                  width: 72, height: 76, borderRadius: 18, flexShrink: 0, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: charLen > 3 ? "1rem" : charLen > 2 ? "1.25rem" : "1.9rem",
                  fontWeight: 700, cursor: "pointer", transition: "all 0.22s",
                  background: bg, border: `2px solid ${border}`,
                  color: isActive && isPendingHalant ? "#fbbf24" : "#e0e7ff",
                  boxShadow: shadow,
                }}
              >
                {empty
                  ? <span style={{ display: "block", width: 22, height: 3, borderRadius: 4, background: isActive ? "#818cf8" : "rgba(255,255,255,0.18)" }} />
                  : display}
                {isActive && (
                  <span style={{
                    position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                    width: 5, height: 5, borderRadius: "50%",
                    background: isPendingHalant ? "#fbbf24" : "#818cf8",
                    animation: "pulse 1.5s infinite",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Builder status line */}
        <div style={{ height: 15, textAlign: "center", marginTop: 3 }}>
          {isBuilding && (
            <p style={{ fontSize: 10, color: "#7c3aed", margin: 0 }}>
              {isPendingHalant ? "🔗 Halant — pick next consonant to join" : `Building: ${builderStr}`}
            </p>
          )}
          {revealed && !isBuilding && (
            <p style={{ fontSize: 10, color: "rgba(165,180,252,0.6)", margin: 0 }}>
              Tap any key for a new guess
            </p>
          )}
        </div>
      </div>

      {/* ── MODIFIER SHELF ───────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: 4 }}>
        <p style={{ fontSize: 9, textAlign: "center", color: "rgba(165,180,252,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 3px" }}>
          అచ్చులు &amp; గుర్తులు · Vowels &amp; Signs
        </p>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 28, background: "linear-gradient(to right,#16213e,transparent)", zIndex: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 28, background: "linear-gradient(to left,#0f3460,transparent)", zIndex: 2, pointerEvents: "none" }} />
          <div style={{ display: "flex", gap: 5, overflowX: "auto", padding: "2px 16px 3px", scrollbarWidth: "none" }}>
            {MODIFIER_SHELF.map((char) => {
              const isHalant  = char === HALANT;
              const isAnusv   = char === ANUSVARA;
              const isVowel   = isIndepVowel(char);
              const isLit     = isHalant ? isPendingHalant : builder.vowelSign === char;

              const bg = isLit
                ? isHalant ? "linear-gradient(135deg,#92400e,#d97706)"
                : isAnusv  ? "linear-gradient(135deg,#5b21b6,#7c3aed)"
                           : "linear-gradient(135deg,#1d4ed8,#2563eb)"
                : isHalant ? "rgba(217,119,6,0.14)"
                : isAnusv  ? "rgba(124,58,237,0.18)"
                : isVowel  ? "rgba(16,185,129,0.12)"
                           : "rgba(29,78,216,0.16)";
              const bd = isLit
                ? isHalant ? "#fbbf24" : isAnusv ? "#c084fc" : "#60a5fa"
                : isHalant ? "rgba(217,119,6,0.38)"
                : isAnusv  ? "rgba(192,132,252,0.4)"
                : isVowel  ? "rgba(16,185,129,0.32)"
                           : "rgba(59,130,246,0.28)";
              const fg = isLit
                ? isHalant ? "#fef3c7" : isAnusv ? "#f3e8ff" : "#bfdbfe"
                : isHalant ? "#fbbf24" : isAnusv ? "#c084fc" : isVowel ? "#6ee7b7" : "#93c5fd";

              return (
                <button key={char} onClick={() => handleModifier(char)}
                  style={{
                    flexShrink: 0, width: 42, height: 42, borderRadius: 11,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.25rem", fontWeight: 700, cursor: "pointer", transition: "all 0.13s",
                    background: bg, border: `1.5px solid ${bd}`, color: fg,
                    boxShadow: isLit ? `0 0 10px ${bd}88` : "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.89)"; }}
                  onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                  onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONSONANT GRID ───────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "0 10px", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(7, 1fr)", gap: 5 }}>
          {CONSONANT_ROWS.map((row, ri) => {
            const rState = rowState[ri] ?? "";
            const rowHot  = enableHeatmap && rState === "hot";
            const rowCold = enableHeatmap && rState === "cold";

            return row.map((char) => (
              <button key={`${ri}-${char}`} onClick={() => handleConsonant(char)}
                style={{
                  borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", fontWeight: 700, cursor: "pointer", transition: "background 0.1s, transform 0.1s, box-shadow 0.3s",
                  WebkitTapHighlightColor: "transparent",
                  background: rowHot
                    ? "linear-gradient(160deg,rgba(251,146,60,0.18) 0%,rgba(234,88,12,0.12) 100%)"
                    : "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)",
                  border: rowHot
                    ? "1.5px solid rgba(251,146,60,0.35)"
                    : "1.5px solid rgba(255,255,255,0.12)",
                  color: rowCold ? "rgba(147,197,253,0.35)" : rowHot ? "#fed7aa" : "#e2e8f0",
                  opacity: rowCold ? 0.5 : 1,
                  boxShadow: rowHot
                    ? "0 0 10px rgba(251,146,60,0.3), inset 0 1px 0 rgba(255,255,255,0.07)"
                    : "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
                onPointerDown={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "linear-gradient(160deg,rgba(139,92,246,0.5) 0%,rgba(99,102,241,0.4) 100%)";
                  el.style.transform = "scale(0.92)";
                }}
                onPointerUp={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = rowHot
                    ? "linear-gradient(160deg,rgba(251,146,60,0.18) 0%,rgba(234,88,12,0.12) 100%)"
                    : "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)";
                  el.style.transform = "scale(1)";
                }}
                onPointerLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = rowHot
                    ? "linear-gradient(160deg,rgba(251,146,60,0.18) 0%,rgba(234,88,12,0.12) 100%)"
                    : "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)";
                  el.style.transform = "scale(1)";
                }}
              >
                {char}
              </button>
            ));
          })}
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: "7px 10px 12px", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6 }}>
        {/* ENTER */}
        <button onClick={handleSubmit}
          style={{
            height: 52, borderRadius: 14, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
            background: "linear-gradient(135deg,#d97706,#f59e0b)",
            border: "none", color: "#1c1917",
            boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
          onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.04em" }}>ENTER</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.72 }}>సమర్పించు</span>
        </button>

        {/* క్ష */}
        <button onClick={handleKsha}
          style={{
            width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", fontWeight: 700, cursor: "pointer",
            background: "linear-gradient(160deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.06) 100%)",
            border: "1.5px solid rgba(255,255,255,0.2)", color: "#e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.91)"; }}
          onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          క్ష
        </button>

        {/* ⌫ */}
        <button onClick={handleBackspace}
          style={{
            height: 52, borderRadius: 14, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
            background: "rgba(239,68,68,0.14)", border: "1.5px solid rgba(239,68,68,0.28)",
            color: "#fca5a5", WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
          onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⌫</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.72 }}>చెరిపివేయి</span>
        </button>
      </div>

      {/* ── DRY PEN OVERLAY ──────────────────────────────────────── */}
      {dryPen && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 50,
          background: "rgba(10,4,26,0.92)", backdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>✍️</div>
          <h2 style={{ color: "#e0e7ff", fontSize: "1.5rem", fontWeight: 800, margin: 0, textAlign: "center" }}>
            Dry Pen!
          </h2>
          <p style={{ color: "rgba(165,180,252,0.65)", fontSize: 13, textAlign: "center", margin: 0, maxWidth: 220 }}>
            You've run out of ink. Pick your keystrokes wisely next time.
          </p>
          <button onClick={handleReset}
            style={{
              marginTop: 8, padding: "12px 32px", borderRadius: 14, fontSize: 15,
              fontWeight: 800, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#f5f3ff",
              boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
            }}
          >
            Reset Game
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
      `}</style>
    </div>
  );
}
