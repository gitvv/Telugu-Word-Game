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

// 6 rows total — 4 completed, 1 active, 1 empty
// Simulates being on guess 5 of 6
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
  // Row 5 — active row
  [
    { text: "", color: "active" },
    { text: "", color: "active" },
    { text: "", color: "active" },
    { text: "", color: "active" },
  ],
  // Row 6 — empty
  [
    { text: "", color: "empty" },
    { text: "", color: "empty" },
    { text: "", color: "empty" },
    { text: "", color: "empty" },
  ],
];

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
      {/* ── Top bar ── */}
      <div
        style={{
          flexShrink: 0,
          height: 44,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
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
            fontSize: 12,
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          5 / 6
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

      {/* ── Board — one continuous grid, scrollable ── */}
      <div
        style={{
          flexShrink: 0,
          overflowY: "auto",
          padding: "8px 12px 4px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          // Fixed height — enough for ~2.5 rows visible, rest scrollable
          maxHeight: 180,
        }}
      >
        {ROWS.map((row, ri) => {
          const isActiveRow = ri === 4;
          return (
            <div
              key={ri}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
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
                      : "rgba(255,255,255,0.05)"
                    : tile.color === "empty"
                      ? "rgba(255,255,255,0.03)"
                      : TILE_BG[tile.color as "green" | "yellow" | "grey"];

                const border =
                  tile.color === "active"
                    ? `2px solid ${isFirstActive ? "#818cf8" : "rgba(255,255,255,0.12)"}`
                    : tile.color === "empty"
                      ? "2px solid rgba(255,255,255,0.07)"
                      : "none";

                return (
                  <div
                    key={ti}
                    style={{
                      height: 54,
                      borderRadius: 10,
                      background: bg,
                      border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      color: "#e0e7ff",
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

      {/* ── Keyboard — takes all remaining space ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
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
