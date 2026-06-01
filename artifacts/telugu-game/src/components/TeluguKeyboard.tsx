import { useRef, useEffect, useState } from "react";
import {
  HALANT,
  ANUSVARA,
  MODIFIER_SHELF,
  CONSONANT_ROWS,
  NON_ADVANCING_MODIFIERS,
  INDEPENDENT_VOWELS,
  WORD_INITIAL_CLUSTERS,
  MEDIAL_UNIVERSAL_SET,
  NO_ROW2_CONSONANTS,
  type AksharaBuilder,
} from "../lib/telugu";

// Dynamically derived from shelf data: index of the first matra =
// count of pre-matra items (independent vowels + ANUSVARA).
// Each button is 44px wide + 6px gap = 50px per slot, 16px left padding.
// Scrolling to slot (PRE_MATRA_COUNT - 1) puts ANUSVARA as the leftmost
// visible item, with matras immediately to its right.
const PRE_MATRA_COUNT = MODIFIER_SHELF.findIndex(
  (c) => !INDEPENDENT_VOWELS.has(c) && c !== ANUSVARA
);
const MATRA_SCROLL_LEFT = 16 + (PRE_MATRA_COUNT - 1) * 50;

interface TeluguKeyboardProps {
  onConsonant: (char: string) => void;
  onModifier: (char: string) => void;
  onCluster: (cluster: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  builder: AksharaBuilder;
  rowHeatmap: ("hot" | "cold" | null)[];
  activeBox: number;
}

// ─── Row 2 computation ────────────────────────────────────────────────────────
// Returns the ordered list of cluster strings to show, or null if Row 2 should
// not appear. Row 2 is only meaningful when exactly one consonant is in the
// builder (the base); once a cluster is already formed there is nothing to offer.
function computeRow2(
  builder: AksharaBuilder,
  activeBox: number
): string[] | null {
  if (builder.consonants.length !== 1) return null;
  const base = builder.consonants[0];

  if (NO_ROW2_CONSONANTS.has(base)) return null;
  // ళ: no word-initial clusters — suppress entirely for box 1.
  if (base === "ళ" && activeBox === 0) return null;

  if (activeBox === 0) {
    // Section 1 — attested word-initial clusters.
    const section1 = [...(WORD_INITIAL_CLUSTERS.get(base) ?? [])];
    const section1Set = new Set(section1);
    // Section 2 — universal medial set, excluding geminates (never word-initial)
    // and deduplicated against Section 1.
    const section2 = MEDIAL_UNIVERSAL_SET
      .filter((sec) => sec !== base) // no geminate in box 1
      .map((sec) => base + HALANT + sec)
      .filter((c) => !section1Set.has(c));
    const result = [...section1, ...section2];
    return result.length > 0 ? result : null;
  } else {
    // Medial — universal set with self-reference removed, then geminate appended.
    // Without the filter, bases that are members of MEDIAL_UNIVERSAL_SET (e.g. త, క)
    // would generate the geminate cluster twice: once from the map and once below.
    const medial = MEDIAL_UNIVERSAL_SET
      .filter((sec) => sec !== base)
      .map((sec) => base + HALANT + sec);
    const geminate = base + HALANT + base; // e.g. తత, క్క, బ్బ
    return [...medial, geminate];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeluguKeyboard({
  onConsonant,
  onModifier,
  onCluster,
  onBackspace,
  onSubmit,
  builder,
  rowHeatmap,
  activeBox,
}: TeluguKeyboardProps) {
  const shelfRef = useRef<HTMLDivElement>(null);

  // Press-feedback state — avoids direct DOM style mutations.
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);
  const [pressedCluster, setPressedCluster] = useState<string | null>(null);

  const isPendingHalant = builder.pendingHalant;

  // Scroll the shelf to show dependent vowel signs the moment the first
  // consonant of a new akshara is tapped (consonants.length 0 → 1).
  useEffect(() => {
    if (builder.consonants.length === 1 && shelfRef.current) {
      if (shelfRef.current.scrollLeft !== MATRA_SCROLL_LEFT) {
        console.log("BEFORE:", shelfRef.current.scrollLeft);
        shelfRef.current.scrollLeft = MATRA_SCROLL_LEFT;
        console.log("AFTER:", shelfRef.current.scrollLeft);
      }
    }
  }, [builder.consonants.length]);

  // Cluster tap — delegates directly to onCluster which sets the builder state
  // in one shot. No intermediate commits, no closure-over-stale-state issues.
  function handleClusterTap(cluster: string) {
    onCluster(cluster);
  }

  const row2 = computeRow2(builder, activeBox);

  return (
    <>
      {/* ── Modifier Shelf (Row 1) ───────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: 4 }}>
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
              position: "absolute", left: 0, top: 0, bottom: 0, width: 28,
              background: "linear-gradient(to right,#16213e,transparent)",
              zIndex: 2, pointerEvents: "none",
            }}
          />
          {/* Right fade */}
          <div
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 28,
              background: "linear-gradient(to left,#0f3460,transparent)",
              zIndex: 2, pointerEvents: "none",
            }}
          />
          <div
            ref={shelfRef}
            style={{
              display: "flex", gap: 6, overflowX: "auto",
              padding: "2px 16px 4px",
              scrollbarWidth: "none",
            }}
          >
            {MODIFIER_SHELF.map((char, idx) => {
              const isHalant = char === HALANT;
              const isVowel = INDEPENDENT_VOWELS.has(char);
              const isActive = isHalant ? isPendingHalant : builder.vowelSign === char;
              return (
                <button
                  key={`${char}-${idx}`}
                  onClick={() => onModifier(char)}
                  style={{
                    flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem", fontWeight: 700, cursor: "pointer",
                    transition: "all 0.15s",
                    background: isActive
                      ? isHalant
                        ? "linear-gradient(135deg,#92400e,#d97706)"
                        : "linear-gradient(135deg,#1d4ed8,#2563eb)"
                      : isHalant ? "rgba(217,119,6,0.15)"
                      : isVowel ? "rgba(16,185,129,0.12)"
                      : "rgba(29,78,216,0.18)",
                    border: `1.5px solid ${
                      isActive
                        ? isHalant ? "#fbbf24" : "#60a5fa"
                        : isHalant ? "rgba(217,119,6,0.4)"
                        : isVowel ? "rgba(16,185,129,0.35)"
                        : "rgba(59,130,246,0.3)"
                    }`,
                    color: isActive
                      ? isHalant ? "#fef3c7" : "#bfdbfe"
                      : isHalant ? "#fbbf24"
                      : isVowel ? "#6ee7b7"
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

      {/* ── Cluster Strip (Row 2) ────────────────────────────────────────────── */}
      {row2 !== null && (
        <div style={{ flexShrink: 0, paddingBottom: 4 }}>
          {/* Label */}
          <p
            style={{
              fontSize: 9,
              textAlign: "center",
              color: "rgba(196,181,253,0.45)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 4px",
            }}
          >
            కూర్పులు · Clusters
          </p>

          {/* Scroll container with fade masks */}
          <div style={{ position: "relative" }}>
            {/* Left fade */}
            <div
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 28,
                background: "linear-gradient(to right,#16213e,transparent)",
                zIndex: 2, pointerEvents: "none",
              }}
            />
            {/* Right fade */}
            <div
              style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: 28,
                background: "linear-gradient(to left,#0f3460,transparent)",
                zIndex: 2, pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex", gap: 6, overflowX: "auto",
                padding: "2px 16px 4px",
                scrollbarWidth: "none", scrollBehavior: "smooth",
              }}
            >
              {row2.map((cluster) => {
                const isPressed = pressedCluster === cluster;
                return (
                  <button
                    key={cluster}
                    onClick={() => handleClusterTap(cluster)}
                    onPointerDown={() => setPressedCluster(cluster)}
                    onPointerUp={() => setPressedCluster(null)}
                    onPointerLeave={() => setPressedCluster(null)}
                    style={{
                      flexShrink: 0,
                      width: 44, height: 44, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.3rem", fontWeight: 700, cursor: "pointer",
                      transition: "all 0.12s",
                      background: isPressed
                        ? "linear-gradient(135deg,rgba(91,33,182,0.55),rgba(109,40,217,0.45))"
                        : "rgba(109,40,217,0.15)",
                      border: `1.5px solid ${isPressed ? "rgba(167,139,250,0.7)" : "rgba(139,92,246,0.35)"}`,
                      color: isPressed ? "#ede9fe" : "#c4b5fd",
                      boxShadow: isPressed ? "0 0 12px rgba(139,92,246,0.4)" : "none",
                      transform: isPressed ? "scale(0.93)" : "scale(1)",
                    }}
                  >
                    {cluster}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Consonant Grid ──────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1, padding: "0 10px", minHeight: 0,
          display: "flex", flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1, minHeight: 0,
            display: "flex", flexDirection: "column", gap: 6,
          }}
        >
          {CONSONANT_ROWS.map((row, ri) => {
            const heat = rowHeatmap[ri] ?? null;
            return (
              <div
                key={ri}
                style={{
                  display: "flex", flex: 1, gap: 6, borderRadius: 10,
                  transition: "opacity 0.35s ease, filter 0.35s ease, box-shadow 0.35s ease",
                  ...(heat === "hot" ? {
                    boxShadow: "0 0 14px rgba(251,146,60,0.55), 0 0 0 1px rgba(251,146,60,0.35)",
                  } : heat === "cold" ? {
                    opacity: 0.28, filter: "grayscale(75%)",
                  } : {}),
                }}
              >
                {row.map((char) => {
                  const isPressed = pressedKey === char;
                  return (
                    <button
                      key={char}
                      onClick={() => {
                        if (char.includes(HALANT)) {
                          onCluster(char);
                        } else if (NON_ADVANCING_MODIFIERS.has(char)) {
                          onModifier(char);
                        } else {
                          onConsonant(char);
                        }
                      }}
                      onPointerDown={() => setPressedKey(char)}
                      onPointerUp={() => setPressedKey(null)}
                      onPointerLeave={() => setPressedKey(null)}
                      style={{
                        flex: 1, borderRadius: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.55rem", fontWeight: 700, cursor: "pointer",
                        background: isPressed
                          ? "linear-gradient(160deg,rgba(139,92,246,0.45) 0%,rgba(99,102,241,0.35) 100%)"
                          : "linear-gradient(160deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.05) 100%)",
                        border: "1.5px solid rgba(255,255,255,0.13)",
                        color: "#e2e8f0",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.07)",
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
          flexShrink: 0, padding: "8px 10px 12px",
          display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6,
        }}
      >
        {/* Enter */}
        <button
          onClick={onSubmit}
          onPointerDown={() => setPressedBtn("enter")}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          style={{
            height: 52, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 1, cursor: "pointer",
            background: "linear-gradient(135deg,#d97706,#f59e0b)",
            border: "none", color: "#1c1917",
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
            width: 52, height: 52, borderRadius: 14,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 1, cursor: "pointer",
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
            height: 52, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 1, cursor: "pointer",
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
