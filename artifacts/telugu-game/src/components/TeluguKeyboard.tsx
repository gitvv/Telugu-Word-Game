import { useRef, useEffect, useState } from "react";
import {
  HALANT,
  MODIFIER_SHELF,
  CONSONANT_ROWS,
  NON_ADVANCING_MODIFIERS,
  INDEPENDENT_VOWELS,
  type AksharaBuilder,
} from "../lib/telugu";

// Number of independent vowels in MODIFIER_SHELF — scroll target for dependent signs.
// Each button is 44px wide + 6px gap = 50px per slot, plus 16px left padding.
const MATRA_SCROLL_LEFT = 16 + 12 * 50; // → "ా" at slot index 12

interface TeluguKeyboardProps {
  onConsonant: (char: string) => void;
  onModifier: (char: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  builder: AksharaBuilder;
  rowHeatmap: ("hot" | "cold" | null)[];
}

export default function TeluguKeyboard({
  onConsonant,
  onModifier,
  onBackspace,
  onSubmit,
  builder,
  rowHeatmap,
}: TeluguKeyboardProps) {
  const shelfRef = useRef<HTMLDivElement>(null);

  // Track which consonant key and which action bar button are pressed,
  // so press feedback is state-driven rather than direct DOM mutation.
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);

  const isPendingHalant = builder.pendingHalant;

  // Scroll the shelf to show dependent vowel signs the moment the first
  // consonant of a new akshara is tapped (consonants.length 0 → 1).
  useEffect(() => {
    if (builder.consonants.length === 1) {
      shelfRef.current?.scrollTo({ left: MATRA_SCROLL_LEFT, behavior: "smooth" });
    }
  }, [builder.consonants.length]);

  return (
    <>
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
            ref={shelfRef}
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              padding: "2px 16px 4px",
              scrollbarWidth: "none",
              scrollBehavior: "smooth",
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
                  onClick={() => onModifier(char)}
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
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {CONSONANT_ROWS.map((row, ri) => {
            const heat = rowHeatmap[ri] ?? null;
            return (
              <div
                key={ri}
                style={{
                  display: "flex",
                  flex: 1,
                  gap: 6,
                  borderRadius: 10,
                  transition: "opacity 0.35s ease, filter 0.35s ease, box-shadow 0.35s ease",
                  ...(heat === "hot" ? {
                    boxShadow: "0 0 14px rgba(251,146,60,0.55), 0 0 0 1px rgba(251,146,60,0.35)",
                  } : heat === "cold" ? {
                    opacity: 0.28,
                    filter: "grayscale(75%)",
                  } : {}),
                }}
              >
                {row.map((char) => {
                  const isPressed = pressedKey === char;
                  return (
                    <button
                      key={char}
                      onClick={() =>
                        NON_ADVANCING_MODIFIERS.has(char)
                          ? onModifier(char)
                          : onConsonant(char)
                      }
                      onPointerDown={() => setPressedKey(char)}
                      onPointerUp={() => setPressedKey(null)}
                      onPointerLeave={() => setPressedKey(null)}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.55rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        background: isPressed
                          ? "linear-gradient(160deg,rgba(139,92,246,0.45) 0%,rgba(99,102,241,0.35) 100%)"
                          : "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)",
                        border: "1.5px solid rgba(255,255,255,0.13)",
                        color: "#e2e8f0",
                        boxShadow:
                          "0 2px 6px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.07)",
                        transform: isPressed ? "scale(0.93)" : "scale(1)",
                        transition: "background 0.1s, transform 0.1s",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            );
          })}
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
          onClick={onSubmit}
          onPointerDown={() => setPressedBtn("enter")}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
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
            transform: pressedBtn === "enter" ? "scale(0.95)" : "scale(1)",
            transition: "transform 0.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.03em" }}>ENTER</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.75 }}>సమర్పించు</span>
        </button>

        {/* Halant ్ */}
        <button
          onClick={() => onModifier(HALANT)}
          onPointerDown={() => setPressedBtn("halant")}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            cursor: "pointer",
            background: "rgba(217,119,6,0.15)",
            border: "1.5px solid rgba(217,119,6,0.4)",
            color: "#fbbf24",
            transform: pressedBtn === "halant" ? "scale(0.92)" : "scale(1)",
            transition: "transform 0.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }}>్</span>
        </button>

        {/* Backspace */}
        <button
          onClick={onBackspace}
          onPointerDown={() => setPressedBtn("backspace")}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
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
            transform: pressedBtn === "backspace" ? "scale(0.95)" : "scale(1)",
            transition: "transform 0.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⌫</span>
          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.75 }}>చెరిపివేయి</span>
        </button>
      </div>
    </>
  );
}
