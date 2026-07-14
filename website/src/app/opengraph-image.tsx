import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "agentOrc — local-first semantic memory for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f0f0f",
          color: "#e5e5e5",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e5e5e5",
              borderRadius: 16,
              color: "#262626",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.06em",
            }}
          >
            aO
          </div>
          <div style={{ fontSize: 42, fontWeight: 600 }}>{siteConfig.name}</div>
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 900,
          }}
        >
          agentOrc — shared semantic memory for AI agents
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "#a3a3a3",
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          Local-first TypeScript SDK · SQLite + sqlite-vec · npm install agentorc
        </div>
      </div>
    ),
    { ...size },
  );
}
