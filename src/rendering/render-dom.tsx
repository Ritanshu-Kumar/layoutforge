import type { ResolvedElement } from "../core/types";

interface RenderDomProps {
  element: ResolvedElement;
}

export function RenderDom({ element }: RenderDomProps) {
  if (!element.visible) {
    return null;
  }

  const style: React.CSSProperties = {
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
          ...style,
          fontSize: element.fontSize,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          fontWeight:
            element.role === "primary" ? 700 : 500,
        }}
      >
        {element.content}
      </div>
    );
  }

  if (element.type === "button") {
    return (
      <button
        style={{
          ...style,
          fontSize: element.fontSize,
          cursor: "pointer",
          border: "none",
          borderRadius: 10,
          fontWeight: 700,
        }}
      >
        {element.content}
      </button>
    );
  }

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "82%",
          height: "82%",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        {element.content}
      </div>
    </div>
  );
}