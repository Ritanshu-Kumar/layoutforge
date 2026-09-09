import { useMemo, useState } from "react";

import { resolveLayout } from "./core/resolver";
import { surfaces } from "./core/surfaces";
import { adSpec } from "./demo/ad-spec";
import { RenderDom } from "./rendering/render-dom";

const surfaceList = Object.values(surfaces);

const surfaceNames: Record<string, string> = {
  mobilePortrait: "Mobile Portrait",
  mobileLandscape: "Mobile Landscape",
  broadcastLowerThird: "Broadcast Lower Third",
  squareKiosk: "Square Kiosk",
  constrained: "Constrained Surface",
};

function App() {
  const [surfaceId, setSurfaceId] = useState(
    surfaces.mobilePortrait.id,
  );

  const surface =
    surfaces[surfaceId] ?? surfaces.mobilePortrait;

  const layout = useMemo(
    () => resolveLayout(adSpec, surface),
    [surface],
  );

  const visibleElements = layout.elements.filter(
    (element) => element.visible,
  );

  const hiddenElements = layout.elements.filter(
    (element) => !element.visible,
  );

  /*
   * This scaling is ONLY for the visual preview.
   * Resolver coordinates remain in the real surface coordinate system.
   */
  const previewScale = Math.min(
    1,
    760 / surface.width,
    520 / surface.height,
  );

  const previewWidth = surface.width * previewScale;
  const previewHeight = surface.height * previewScale;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: 30 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 8,
            }}
          >
            LayoutForge
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px, 5vw, 48px)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            Adaptive Layout Engine
          </h1>

          <p
            style={{
              maxWidth: 760,
              margin: "14px 0 0",
              fontSize: 17,
              lineHeight: 1.6,
              color: "#6b7280",
            }}
          >
            One declarative ad specification. Different surface
            constraints. A deterministic TypeScript resolver produces
            a valid composition for each surface.
          </p>
        </header>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 35px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                }}
              >
                Surface preview
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                Switch surfaces to re-run the resolver.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                <StatusPill text="TypeScript Resolver" />
                <StatusPill text="No Surface Branches" />
                <StatusPill
                  text={
                    layout.valid
                      ? "Constraints Satisfied"
                      : "Constraints Failed"
                  }
                />
              </div>
            </div>

            <select
              value={surfaceId}
              onChange={(event) =>
                setSurfaceId(event.target.value)
              }
              style={{
                padding: "11px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                minWidth: 240,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              {surfaceList.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {surfaceNames[item.id] ?? item.id}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 320px",
              gap: 28,
              alignItems: "start",
            }}
          >
            <div
              style={{
                minHeight: 560,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
                background: "#f8fafc",
                borderRadius: 16,
                overflow: "auto",
              }}
            >
              <div
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: surface.width,
                    height: surface.height,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    overflow: "hidden",
                    background: "#ffffff",
                    border: "2px solid #111827",
                    borderRadius: 12,
                  }}
                >
                  {layout.elements.map((element) => (
                    <RenderDom
                      key={element.id}
                      element={element}
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <InfoCard
                label="Resolution"
                value={layout.valid ? "VALID" : "INVALID"}
              />

              <InfoCard
                label="Surface"
                value={`${surface.width} × ${surface.height}`}
              />

              <InfoCard
                label="Visible"
                value={String(visibleElements.length)}
              />

              <InfoCard
                label="Hidden"
                value={String(hiddenElements.length)}
              />

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 14,
                  }}
                >
                  Resolution decisions
                </h3>

                {layout.decisions.length === 0 ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      lineHeight: 1.5,
                    }}
                  >
                    No degradation required.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {layout.decisions.map(
                      (decision, index) => (
                        <div
                          key={`${decision.elementId}-${index}`}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <strong>
                              {decision.elementId}
                            </strong>

                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                opacity: 0.55,
                              }}
                            >
                              {decision.action}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              lineHeight: 1.45,
                              color: "#6b7280",
                            }}
                          >
                            {decision.reason}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>

        <footer
          style={{
            marginTop: 18,
            fontSize: 13,
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          Layout decisions are computed in TypeScript. CSS is used
          only to render the resolved geometry.
        </footer>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "#9ca3af",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  text,
}: {
  text: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
}

export default App;