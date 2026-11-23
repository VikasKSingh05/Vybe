import { ImageResponse } from "next/og";

export const alt = "VYBE LIVE — One station. Everyone, in sync.";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 50% 130%, rgba(255,107,61,0.3), rgba(255,107,61,0) 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          <div
            style={{
              width: 16,
              height: 84,
              borderRadius: 8,
              backgroundColor: "#ff6b3d",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 148,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "#ffffff",
            }}
          >
            VYBE
          </div>
          <div
            style={{
              width: 16,
              height: 84,
              borderRadius: 8,
              backgroundColor: "#ff6b3d",
              display: "flex",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 42,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "-0.01em",
          }}
        >
          One station. Everyone, in sync.
        </div>
      </div>
    ),
    { ...size },
  );
}
