import { useState, useRef, useEffect } from "react";
import {
  WORD_LENGTH,
  HALANT,
  NON_ADVANCING_MODIFIERS,
  INDEPENDENT_VOWELS,
  CONSONANT_ROWS,
  type FeedbackColor,
  type AksharaBuilder,
  emptyBuilder,
  renderBuilder,
  finalizeBuilder,
  reopenCommitted,
  computeFeedback,
  computeHeatmap,
} from "../lib/telugu";
import TeluguKeyboard from "../components/TeluguKeyboard";

// ─── Switchboard ──────────────────────────────────────────────────────────────
const ENABLE_STANDARD_FEEDBACK = true;
const ENABLE_PHONETIC_HEATMAP  = true;
const ENABLE_INK_ECONOMY       = false;

// ─── Secret word & feedback helpers ───────────────────────────────────────────
const SECRET_WORD = "రాష్ట్రపతి";
const SECRET_AKSHARAS: string[] =
  [...new Intl.Segmenter().segment(SECRET_WORD)].map((s) => s.segment);

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
  const [feedback, setFeedback] = useState<(FeedbackColor | null)[]>(Array(WORD_LENGTH).fill(null));
  const [revealed, setRevealed] = useState(false);
  const [rowHeatmap, setRowHeatmap] = useState<("hot" | "cold" | null)[]>(Array(CONSONANT_ROWS.length).fill(null));

  // Silence unused-variable warning for ENABLE_INK_ECONOMY until it is wired up.
  void ENABLE_INK_ECONOMY;

  // Clear feedback colours and heatmap whenever the user edits any box
  useEffect(() => {
    setFeedback(Array(WORD_LENGTH).fill(null));
    setRevealed(false);
    setRowHeatmap(Array(CONSONANT_ROWS.length).fill(null));
  }, [boxes]);

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
    if (ENABLE_PHONETIC_HEATMAP) setRowHeatmap(Array(CONSONANT_ROWS.length).fill(null));
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
    // ── Non-advancing modifiers: ం (anusvara) and ృ (rrukar) ──────────────────
    if (NON_ADVANCING_MODIFIERS.has(char)) {
      if (builder.consonants.length > 0) {
        // ృ acts as a vowel sign on the consonant cluster (కృ);
        // ం appends after the finalized akshara (కం)
        const akshara = char === "ృ"
          ? finalizeBuilder({ ...builder, vowelSign: "ృ", pendingHalant: false })
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

  // ── Backspace ──────────────────────────────────────────────────────────────
  function handleBackspace() {
    if (ENABLE_PHONETIC_HEATMAP) setRowHeatmap(Array(CONSONANT_ROWS.length).fill(null));
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
    const { builder: reopened, hadAnusvara } = reopenCommitted(content);
    setBoxes((bx) => { const nx = [...bx]; nx[targetBox] = ""; return nx; });
    if (hadAnusvara) {
      // Anusvara was the outermost layer — show the remaining cluster (with vowelSign if any)
      // without peeling further; next backspace will remove the vowel sign or conjunct.
      setBuilder(reopened);
    } else if (reopened.vowelSign) {
      // Remove vowel sign, keep consonant cluster
      setBuilder({ ...reopened, vowelSign: null });
    } else {
      // Peel the last conjunct consonant (or keep single consonant for one more step)
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
    if (ENABLE_STANDARD_FEEDBACK) {
      const computed = computeFeedback(finalBoxes, SECRET_AKSHARAS);
      setFeedback(computed);
      setTimeout(() => setRevealed(true), 30);
    }
    if (ENABLE_PHONETIC_HEATMAP) {
      setRowHeatmap(computeHeatmap(SECRET_WORD));
    }
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
            const fbColor = feedback[i] ?? null;

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
                  overflow: "hidden",
                  fontSize: charLen > 3 ? "1rem" : charLen > 2 ? "1.3rem" : "1.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  position: "relative",
                  transition: "box-shadow 0.18s, transform 0.18s, border-color 0.18s",
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
                {/* Feedback colour overlay — fades in 0.5s after ENTER */}
                <span style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    fbColor === "green"  ? "#10b981" :
                    fbColor === "yellow" ? "#f59e0b" :
                    fbColor === "gray"   ? "#334155" : "transparent",
                  opacity: revealed && fbColor ? 1 : 0,
                  transition: "opacity 0.5s ease",
                  zIndex: 0,
                  pointerEvents: "none",
                }} />
                {/* Content sits above the overlay */}
                <span style={{ position: "relative", zIndex: 1 }}>
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
                </span>
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
                      zIndex: 1,
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

      {/* ── Keyboard ────────────────────────────────────────────────────────── */}
      <TeluguKeyboard
        onConsonant={handleConsonant}
        onModifier={handleModifier}
        onBackspace={handleBackspace}
        onSubmit={handleSubmit}
        builder={builder}
        rowHeatmap={rowHeatmap}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
