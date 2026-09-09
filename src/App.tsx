import { useMemo, useState } from "react";

import { resolveLayout } from "./core/resolver";
import { surfaces } from "./core/surfaces";
import { adSpec } from "./demo/ad-spec";
import { RenderDom } from "./rendering/render-dom";

const surfaceList = Object.values(surfaces);

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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.55,
              marginBottom: 8,
            }}
          >
            LayoutForge
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 42,
              letterSpacing: "-0.03em",
            }}
          >
            Adaptive Layout Engine
          </h1>

          <p
            style={{
              maxWidth: 720,
              fontSize: 17,
              lineHeight: 1.6,
              opacity: 0.7,
            }}
          >
            One declarative ad specification. Different surface
            constraints. A deterministic resolver produces a valid
            composition for each surface.
          </p>
        </header>

        <section
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Surface preview
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.6,
                }}
              >
                Switch surfaces to re-run the resolver.
              </p>
            </div>

            <select
              value={surfaceId}
              onChange={(event) =>
                setSurfaceId(event.target.value)
              }
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                minWidth: 220,
              }}
            >
              {surfaceList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id}
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
                background: "#f9fafb",
                borderRadius: 14,
                overflow: "auto",
              }}
            >
              <div
                style={{
                  width: surface.width,
                  height: surface.height,
                  position: "relative",
                  overflow: "hidden",
                  background: "#ffffff",
                  border: "2px solid #111827",
                  borderRadius: 12,
                  flexShrink: 0,
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

            <aside
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
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
                      opacity: 0.6,
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
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>
                            {decision.elementId}
                          </strong>{" "}
                          <span
                            style={{
                              opacity: 0.65,
                            }}
                          >
                            → {decision.action}
                          </span>
                          <div
                            style={{
                              opacity: 0.6,
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
            fontSize: 13,
            opacity: 0.5,
          }}
        >
          Layout decisions are computed in TypeScript. CSS is
          used only to render the resolved geometry.
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
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default App;