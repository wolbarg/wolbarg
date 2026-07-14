import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          color: "#f5f5f5",
          fontSize: 15,
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
