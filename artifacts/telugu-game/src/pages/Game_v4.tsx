import { useState } from "react";
import TeluguKeyboard from "../components/TeluguKeyboard";

const DUMMY_BUILDER = {
  consonants: [] as string[],
  vowelSign: null,
  pendingHalant: false,
};

const DUMMY_HEATMAP: ("hot" | "cold" | null)[] = [
  "cold",
  "cold",
  "hot",
  "hot",
  "hot",
  "cold",
  "cold",
];

const TILE_BG: Record<"green" | "yellow" | "grey", string> = {
  green: "#166534",
  yellow: "#854d0e",
  grey: "#374151",
};

// Board lives on a lighter dark — visually distinct from keyboard
const BOARD_BG = "#1e2a3a";
// Keyboard stays deep dark — same as current
const KBD_BG = "linear-gradient(160deg,#1a0a2e 0%,#16213e 55%,#0f3460 100%)";

const ROWS: {
  text: string;
  color: "green" | "yellow" | "grey" | "empty" | "active";
}[][] = [
  [
    { text: "కా", color: "grey" },
    { text: "లం", color: "grey" },
    { text: "డు", color: "grey" },
    { text: "రా", color: "grey" },
  ],
  [
    { text: "మం", color: "yellow" },
    { text: "చి", color: "grey" },
    { text: "త", color: "green" },
    { text: "నం", color: "grey" },
  ],
  [
    { text: "అ", color: "grey" },
    { text: "న్న", color: "yellow" },
    { text: "త", color: "green" },
    { text: "రం", color: "yellow" },
  ],
  [
    { text: "మం", color: "green" },
    { text: "చి", color: "yellow" },
    { text: "త", color: "green" },
    { text: "నం", color: "yellow" },
  ],
  [
    { text: "", color: "active" },
    { text: "", color: "active" },
    { text: "", color: "active" },
    { text: "", color: "active" },
  ],
  [
    { text: "", color: "empty" },
    { text: "", color: "empty" },
    { text: "", color: "empty" },
    { text: "", color: "empty" },
  ],
];

const WORD_LENGTH = ROWS[0].length;

const FONT_SIZE =
  WORD_LENGTH === 3 ? "1.4rem" : WORD_LENGTH === 5 ? "0.95rem" : "1.1rem";

export default function Game_v4() {
  const [activeContent, setActiveContent] = useState("");

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: KBD_BG,
        overflow: "hidden",
      }}
    >
      {/* Top bar — sits on board colour */}
      <div
        style={{
          flexShrink: 0,
          height: 48,
          background: BOARD_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ☰
        </button>
        <span
          style={{
            fontSize: 13,
            color: "#cbd5e1",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          ఒక్క మాట &nbsp;•&nbsp; 5 / 6
        </span>
        <button
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
          }}
        >
          📊
        </button>
      </div>

      {/* Board — lighter background, side padding, smaller tiles */}
      <div
        style={{
          flexShrink: 0,
          background: BOARD_BG,
          overflowY: "auto",
          // Side padding creates floating effect — board doesn't touch edges
          padding: "12px 32px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: "28dvh",
          borderBottom: "2px solid rgba(255,255,255,0.06)",
        }}
      >
        {ROWS.map((row, ri) => {
          const isActiveRow = ri === ROWS.length - 2;
          return (
            <div
              key={ri}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${WORD_LENGTH}, minmax(0, 1fr))`,
                gap: 6,
                flexShrink: 0,
              }}
            >
              {row.map((tile, ti) => {
                const isFirstActive = isActiveRow && ti === 0;
                const bg =
                  tile.color === "active"
                    ? isFirstActive
                      ? "linear-gradient(135deg,#312e81,#4338ca)"
                      : "rgba(255,255,255,0.06)"
                    : tile.color === "empty"
                      ? "rgba(255,255,255,0.02)"
                      : TILE_BG[tile.color as "green" | "yellow" | "grey"];
                const border =
                  tile.color === "active"
                    ? `2px solid ${isFirstActive ? "#818cf8" : "rgba(255,255,255,0.15)"}`
                    : tile.color === "empty"
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "none";
                return (
                  <div
                    key={ti}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: bg,
                      border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: FONT_SIZE,
                      fontWeight: 700,
                      color: "#e0e7ff",
                      overflow: "hidden",
                    }}
                  >
                    {isActiveRow && ti === 0 ? activeContent : tile.text}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Keyboard — deep dark, side padding so it doesn't go wall to wall */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "0 8px",
        }}
      >
        <TeluguKeyboard
          builder={DUMMY_BUILDER}
          rowHeatmap={DUMMY_HEATMAP}
          activeBox={0}
          onConsonant={(char) => setActiveContent(char)}
          onModifier={() => {}}
          onCluster={(cluster) => setActiveContent(cluster)}
          onBackspace={() => setActiveContent("")}
          onSubmit={() => setActiveContent("")}
        />
      </div>
    </div>
  );
}
