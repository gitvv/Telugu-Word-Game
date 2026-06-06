import { useRef } from "react";

/* ─── Palette ─────────────────────────────────────────── */
const BG = "linear-gradient(170deg,#0d0b1e 0%,#16213e 50%,#0f3460 100%)";
const BOARD_BG = "rgba(255,255,255,0.04)";
const TILE_EMPTY = "rgba(255,255,255,0.05)";
const TILE_ACTIVE_CURSOR = "linear-gradient(135deg,#312e81,#4338ca)";
const TILE_ACTIVE_FILLED = "rgba(99,102,241,0.18)";
const TILE_GREEN = "#166534";
const TILE_YELLOW = "#854d0e";
const TILE_GREY = "#374151";
const KEY_BG = "rgba(255,255,255,0.08)";
const KEY_BORDER = "rgba(255,255,255,0.12)";

/* ─── Demo board data ─────────────────────────────────── */
type TileState = "empty" | "cursor" | "filled" | "green" | "yellow" | "grey";

const BOARD: { text: string; state: TileState }[][] = [
  [
    { text: "కా", state: "grey" },
    { text: "లం", state: "grey" },
    { text: "డు", state: "green" },
    { text: "రా", state: "grey" },
  ],
  [
    { text: "మం", state: "yellow" },
    { text: "చి", state: "grey" },
    { text: "త", state: "green" },
    { text: "నం", state: "grey" },
  ],
  [
    { text: "అ", state: "grey" },
    { text: "న్న", state: "yellow" },
    { text: "త", state: "green" },
    { text: "రం", state: "yellow" },
  ],
  [
    { text: "మం", state: "green" },
    { text: "చి", state: "yellow" },
    { text: "త", state: "green" },
    { text: "నం", state: "yellow" },
  ],
  // active row — first tile has cursor
  [
    { text: "", state: "cursor" },
    { text: "", state: "filled" },
    { text: "", state: "filled" },
    { text: "", state: "filled" },
  ],
  [
    { text: "", state: "empty" },
    { text: "", state: "empty" },
    { text: "", state: "empty" },
    { text: "", state: "empty" },
  ],
];

/* ─── Vowel signs (matras) for the Secret Scroll ─────── */
const VOWEL_SIGNS = [
  { label: "అ", sign: "" },
  { label: "ఆ", sign: "ా" },
  { label: "ఇ", sign: "ి" },
  { label: "ఈ", sign: "ీ" },
  { label: "ఉ", sign: "ు" },
  { label: "ఊ", sign: "ూ" },
  { label: "ఎ", sign: "ే" },
  { label: "ఏ", sign: "ే" },
  { label: "ఐ", sign: "ై" },
  { label: "ఒ", sign: "ో" },
  { label: "ఓ", sign: "ో" },
  { label: "ఔ", sign: "ౌ" },
  { label: "అం", sign: "ం" },
  { label: "అః", sign: "ః" },
];

/* ─── Consonants — 2 groups of 5, shown as 10 columns ── */
const CONSONANT_ROWS: [string[], string[]][] = [
  [["క", "ఖ", "గ", "ఘ", "ఙ"], ["చ", "ఛ", "జ", "ఝ", "ఞ"]],
  [["ట", "ఠ", "డ", "ఢ", "ణ"], ["త", "థ", "ద", "ధ", "న"]],
  [["ప", "ఫ", "బ", "భ", "మ"], ["య", "ర", "ల", "వ", "శ"]],
  [["ష", "స", "హ", "ళ", "క్ష"], ["ఱ", "ఒ", "ఓ", "ఔ", "అ"]],
];

/* ─── Tile background helper ──────────────────────────── */
function tileBg(state: TileState) {
  switch (state) {
    case "cursor":
      return TILE_ACTIVE_CURSOR;
    case "filled":
      return TILE_ACTIVE_FILLED;
    case "green":
      return TILE_GREEN;
    case "yellow":
      return TILE_YELLOW;
    case "grey":
      return TILE_GREY;
    default:
      return TILE_EMPTY;
  }
}

function tileBorder(state: TileState) {
  if (state === "cursor") return "2px solid #818cf8";
  if (state === "filled") return "2px solid rgba(129,140,248,0.4)";
  if (state === "empty") return "1.5px solid rgba(255,255,255,0.08)";
  return "none";
}

/* ─── Component ───────────────────────────────────────── */
export default function Game_v5() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: BG,
        overflow: "hidden",
        fontFamily: "'Noto Sans Telugu', 'Mandali', sans-serif",
        userSelect: "none",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          height: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <button style={iconBtn}>☰</button>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: "#c7d2fe",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.06em",
            }}
          >
            తెలుగు పదం
          </div>
          <div
            style={{ color: "#6366f1", fontSize: 10, letterSpacing: "0.12em" }}
          >
            TELUGU WORDLE
          </div>
        </div>
        <button style={iconBtn}>📊</button>
      </div>

      {/* ── Guess Area (4 × 6 grid) ──────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          background: BOARD_BG,
          backdropFilter: "blur(4px)",
          padding: "14px 24px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {BOARD.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 7,
            }}
          >
            {row.map((tile, ti) => (
              <div
                key={ti}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  background: tileBg(tile.state),
                  border: tileBorder(tile.state),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color:
                    tile.state === "cursor"
                      ? "#e0e7ff"
                      : tile.state === "empty" || tile.state === "filled"
                        ? "#94a3b8"
                        : "#f1f5f9",
                  boxShadow:
                    tile.state === "cursor"
                      ? "0 0 12px rgba(99,102,241,0.5)"
                      : tile.state === "green"
                        ? "0 0 8px rgba(22,101,52,0.6)"
                        : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tile.text}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Keyboard area (fills remaining space) ────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "10px 10px 8px",
          gap: 8,
          overflowY: "auto",
        }}
      >
        {/* Secret Scroll — vowel signs */}
        <div>
          <div
            style={{
              color: "rgba(147,197,253,0.55)",
              fontSize: 9,
              letterSpacing: "0.14em",
              fontWeight: 600,
              marginBottom: 5,
              paddingLeft: 2,
              textTransform: "uppercase",
            }}
          >
            అచ్చులు &amp; గుర్తులు · VOWELS &amp; SIGNS
          </div>
          <div
            ref={scrollRef}
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              scrollbarWidth: "none",
              paddingBottom: 2,
            }}
          >
            {VOWEL_SIGNS.map((v, i) => (
              <button
                key={i}
                style={{
                  flexShrink: 0,
                  minWidth: 44,
                  height: 44,
                  borderRadius: 10,
                  border: "1.5px solid rgba(96,165,250,0.55)",
                  background:
                    i === 0
                      ? "rgba(96,165,250,0.18)"
                      : "rgba(96,165,250,0.07)",
                  color: i === 0 ? "#93c5fd" : "#60a5fa",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    i === 0
                      ? "0 0 10px rgba(96,165,250,0.35)"
                      : "none",
                  padding: "0 8px",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Consonant keyboard — 10 columns (2 × 5) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {CONSONANT_ROWS.map(([left, right], ri) => (
            <div
              key={ri}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: 5,
              }}
            >
              {[...left, ...right].map((char, ci) => {
                const isSeparator = ci === 5;
                return (
                  <button
                    key={ci}
                    style={{
                      gridColumn: isSeparator ? undefined : undefined,
                      aspectRatio: "1 / 1",
                      borderRadius: 9,
                      background:
                        ci === 4 || ci === 9
                          ? "rgba(255,255,255,0.05)"
                          : KEY_BG,
                      border: `1px solid ${ci === 4 || ci === 9 ? "rgba(255,255,255,0.08)" : KEY_BORDER}`,
                      color:
                        ci === 4 || ci === 9 ? "#94a3b8" : "#e2e8f0",
                      fontSize: "clamp(0.75rem, 3.5vw, 1.05rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      transition: "background 0.1s",
                      padding: 0,
                    }}
                    onPointerDown={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(99,102,241,0.35)";
                    }}
                    onPointerUp={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        KEY_BG;
                    }}
                    onPointerLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        KEY_BG;
                    }}
                  >
                    {char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 1,
          }}
        />

        {/* Action bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6 }}>
          {/* ENTER */}
          <button
            style={{
              height: 50,
              borderRadius: 12,
              background: "linear-gradient(135deg,#d97706,#b45309)",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.06em",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.2,
              boxShadow: "0 3px 10px rgba(217,119,6,0.45)",
            }}
          >
            <span>ENTER</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 400,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.1em",
              }}
            >
              సమర్పించు
            </span>
          </button>

          {/* Halant */}
          <button
            style={{
              width: 54,
              height: 50,
              borderRadius: 12,
              background: "linear-gradient(135deg,#92400e,#78350f)",
              border: "none",
              color: "#fde68a",
              fontSize: "1.4rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(146,64,14,0.45)",
            }}
            title="హలంత (Halant)"
          >
            ్
          </button>

          {/* Backspace */}
          <button
            style={{
              width: 54,
              height: 50,
              borderRadius: 12,
              background: "linear-gradient(135deg,#9f1239,#be123c)",
              border: "none",
              color: "#fda4af",
              fontSize: "1.2rem",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.2,
              gap: 2,
              boxShadow: "0 3px 10px rgba(159,18,57,0.45)",
            }}
            title="చెరిపేయి (Backspace)"
          >
            <span>⌫</span>
            <span
              style={{
                fontSize: 8,
                color: "rgba(253,164,175,0.7)",
                letterSpacing: "0.05em",
              }}
            >
              చెరిపేయి
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared micro-styles ─────────────────────────────── */
const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: 18,
  cursor: "pointer",
  padding: 6,
  borderRadius: 8,
  lineHeight: 1,
};
