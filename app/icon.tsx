import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#070907",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#d6ff3f",
            boxShadow: "5px 5px 0 #ff5b35",
            color: "#080b07",
            display: "flex",
            fontFamily: "Arial Narrow, sans-serif",
            fontSize: 24,
            fontWeight: 900,
            height: 48,
            justifyContent: "center",
            width: 48,
          }}
        >
          T/R
        </div>
      </div>
    ),
    size,
  );
}
