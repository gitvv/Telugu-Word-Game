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

const BG = "linear-gradient(160deg,#1a0a2e 0%,#16213e 55%,#0f3460 100%)";

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

// Word length = tiles per row — NOT total rows
const WORD_LENGTH = ROWS[0].length;

// Font scales with word length — Telugu aksharas need vertical room
const FONT_SIZE =
  WORD_LENGTH === 3 ? "1.6rem" : WORD_LENGTH === 5 ? "1.0rem" : "1.25rem";

export default function Game_v2() {
  const [activeContent, setActiveContent] = useState("");

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: BG,
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          height: 48,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 20,
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
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
            padding: 4,
          }}
        >
          📊
        </button>
      </div>

      {/* Board */}
      <div
        style={{
          flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
          overflowY: "auto",
          padding: "12px 24px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "26dvh",
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
                gap: 8,
                flexShrink: 0,
              }}
            >
              {row.map((tile, ti) => {
                const isFirstActive = isActiveRow && ti === 0;
                const bg =
                  tile.color === "active"
                    ? isFirstActive
                      ? "linear-gradient(135deg,#312e81,#4338ca)"
                      : "rgba(255,255,255,0.04)"
                    : tile.color === "empty"
                      ? "rgba(255,255,255,0.01)"
                      : TILE_BG[tile.color as "green" | "yellow" | "grey"];
                const border =
                  tile.color === "active"
                    ? `2px solid ${isFirstActive ? "#818cf8" : "rgba(255,255,255,0.15)"}`
                    : tile.color === "empty"
                      ? "1px solid rgba(255,255,255,0.05)"
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

      {/* Keyboard */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid rgba(255,255,255,0.05)",
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
