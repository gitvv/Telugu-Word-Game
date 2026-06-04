import { useState } from "react";
import TeluguKeyboard from "../components/TeluguKeyboard";

const DUMMY_BUILDER = { consonants: [] as string[], vowelSign: null, pendingHalant: false };
const DUMMY_HEATMAP: ("hot" | "cold" | null)[] = [null, null, null, null, null, null, null];

const DUMMY_ROWS: { text: string; color: "green" | "yellow" | "grey" }[][] = [
  [
    { text: "మం", color: "yellow" },
    { text: "చి", color: "grey" },
    { text: "త",  color: "green" },
    { text: "నం", color: "grey" },
  ],
  [
    { text: "మం", color: "green" },
    { text: "చి", color: "yellow" },
    { text: "త",  color: "green" },
    { text: "నం", color: "yellow" },
  ],
];

const TILE_BG: Record<"green" | "yellow" | "grey", string> = {
  green:  "#166534",
  yellow: "#854d0e",
  grey:   "#374151",
};

const BG = "linear-gradient(160deg,#1a0a2e 0%,#16213e 55%,#0f3460 100%)";

function TopBar() {
  return (
    <div style={{
      height: 44,
      flexShrink: 0,
      background: "rgba(0,0,0,0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
    }}>
      <button style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 4 }}>
        ☰
      </button>
      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>3 / 6</span>
      <button style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 4 }}>
        📊
      </button>
    </div>
  );
}

export default function Game_v2() {
  const [reviewMode, setReviewMode] = useState(false);

  function handleSubmit() {
    setReviewMode(true);
  }

  function handleContinue() {
    setReviewMode(false);
  }

  if (reviewMode) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG }}>
        <TopBar />

        {/* Board area */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 0" }}>
          {DUMMY_ROWS.map((row, ri) => (
            <div key={ri} style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              padding: "0 12px",
              marginBottom: 8,
            }}>
              {row.map((tile, ti) => (
                <div key={ti} style={{
                  height: 56,
                  borderRadius: 10,
                  background: TILE_BG[tile.color],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#fff",
                }}>
                  {tile.text}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Continue button */}
        <div style={{ flexShrink: 0, padding: "0 16px 16px" }}>
          <button
            onClick={handleContinue}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg,#d97706,#f59e0b)",
              border: "none",
              color: "#1c1917",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            కొనసాగించు · Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG }}>
      <TopBar />

      {/* Active tile row */}
      <div style={{
        flexShrink: 0,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        padding: "8px 12px",
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 64,
            borderRadius: 10,
            background: i === 0 ? "linear-gradient(135deg,#312e81,#4338ca)" : "rgba(255,255,255,0.05)",
            border: `2px solid ${i === 0 ? "#818cf8" : "rgba(255,255,255,0.12)"}`,
          }} />
        ))}
      </div>

      {/* Fallback test button — remove once ENTER confirmed working */}
      <button onClick={handleSubmit} style={{
        margin: "4px 12px",
        padding: "8px",
        background: "#6366f1",
        color: "white",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
      }}>
        TEST: Switch to Review Mode
      </button>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <TeluguKeyboard
          builder={DUMMY_BUILDER}
          rowHeatmap={DUMMY_HEATMAP}
          activeBox={0}
          onConsonant={() => {}}
          onModifier={() => {}}
          onCluster={() => {}}
          onBackspace={() => {}}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
