import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#262626",
          borderRadius: 40,
          color: "#f5f5f5",
          fontSize: 84,
          fontWeight: 700,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          letterSpacing: "-0.06em",
        }}
      >
        aO
      </div>
    ),
    { ...size },
  );
}
