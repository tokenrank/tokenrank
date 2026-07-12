import { ImageResponse } from "next/og";

export const alt = "TokenRank AI token leaderboard";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#070907",
          color: "#f2f1e8",
          display: "flex",
          fontFamily: "Arial Narrow, Arial, sans-serif",
          height: "100%",
          padding: 42,
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #343a33",
            display: "flex",
            flex: 1,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#d6ff3f",
              color: "#080b07",
              display: "flex",
              fontSize: 17,
              fontWeight: 900,
              justifyContent: "space-between",
              letterSpacing: 3,
              padding: "12px 20px",
            }}
          >
            <span>LIVE BOARD // OVERALL</span>
            <span>AI TOKEN LEAGUE // 2026</span>
          </div>

          <div style={{ display: "flex", flex: 1 }}>
            <div
              style={{
                borderRight: "2px solid #343a33",
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 38,
              }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
                <div
                  style={{
                    alignItems: "center",
                    background: "#d6ff3f",
                    boxShadow: "7px 7px 0 #ff5b35",
                    color: "#080b07",
                    display: "flex",
                    fontSize: 25,
                    fontWeight: 900,
                    height: 64,
                    justifyContent: "center",
                    width: 64,
                  }}
                >
                  T/R
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 34, fontWeight: 900 }}>TOKEN/RANK</div>
                  <div style={{ color: "#858b80", fontSize: 14, fontWeight: 800, letterSpacing: 4 }}>
                    AI TOKEN LEAGUE
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#ff5b35", fontSize: 18, fontWeight: 900, letterSpacing: 3 }}>
                  AGGREGATE USAGE // PRIVATE CONTENT
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 92,
                    fontWeight: 900,
                    letterSpacing: -5,
                    lineHeight: 0.86,
                    marginTop: 18,
                    maxWidth: 760,
                    textTransform: "uppercase",
                  }}
                >
                  <div>BURN TOKENS.</div>
                  <div>ASCEND RANKS.</div>
                </div>
              </div>

              <div style={{ color: "#858b80", display: "flex", fontSize: 17, fontWeight: 800, gap: 25 }}>
                <span>CODEX</span>
                <span>CLAUDE CODE</span>
                <span>GEMINI</span>
                <span>QWEN</span>
              </div>
            </div>

            <div
              style={{
                background: "#0d100e",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 28,
                width: 250,
              }}
            >
              <div style={{ color: "#858b80", fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>RANK / 001</div>
              <div style={{ color: "#d6ff3f", fontSize: 132, fontWeight: 900, letterSpacing: -8, lineHeight: 0.8 }}>01</div>
              <div style={{ borderTop: "2px solid #343a33", color: "#f2f1e8", fontSize: 18, fontWeight: 800, lineHeight: 1.4, paddingTop: 18 }}>
                Aggregate tokens. Fair ranking. No source code uploaded.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
