import type { CSSProperties } from "react";
import type { ResolvedElement } from "../core/types";

interface RenderDomProps {
  element: ResolvedElement;
}

export function RenderDom({ element }: RenderDomProps) {
  if (!element.visible) {
    return null;
  }

  const baseStyle: CSSProperties = {
    position: "absolute",
    left: element.rect.x,
    top: element.rect.y,
    width: element.rect.width,
    height: element.rect.height,
    boxSizing: "border-box",
  };

  if (element.type === "text") {
    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          padding: "0 10px",
          color: "#111827",
          fontSize: element.fontSize,
          fontWeight: element.role === "primary" ? 700 : 500,
          lineHeight: 1.15,
          whiteSpace: "normal",
          overflowWrap: "break-word",
        }}
      >
        {element.content}
      </div>
    );
  }

  if (element.type === "button") {
    return (
      <button
        type="button"
        style={{
          ...baseStyle,
          border: 0,
          borderRadius: 12,
          background: "#111827",
          color: "#ffffff",
          fontSize: element.fontSize,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {element.content}
      </button>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8%",
      }}
    >
      <div
        style={{
          width: "72%",
          height: "82%",
          borderRadius: "22% 22% 12% 12%",
          background: "linear-gradient(145deg, #dbeafe, #93c5fd)",
          border: "2px solid #1e3a8a",
          position: "relative",
          boxShadow: "0 18px 35px rgba(15, 23, 42, 0.16)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "8%",
            width: "84%",
            height: "52%",
            borderRadius: 12,
            background: "#0f172a",
          }}
        >
          <div
            style={{
              width: "46%",
              height: "46%",
              margin: "12% auto 0",
              borderRadius: "50%",
              background: "#60a5fa",
              border: "3px solid #dbeafe",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "9%",
            left: "6%",
            right: "6%",
            textAlign: "center",
            fontSize: "clamp(7px, 0.75vw, 16px)",
            whiteSpace: "nowrap",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "0.08em",
          }}
        >
          NOVA X1
        </div>
      </div>
    </div>
  );
}