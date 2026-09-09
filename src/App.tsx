import { resolveLayout } from "./core/resolver";
import { surfaces } from "./core/surfaces";
import { adSpec } from "./demo/ad-spec";

function printLayout(
  name: string,
  layout: ReturnType<typeof resolveLayout>,
) {
  console.log(`=== ${name} ===`);
  console.log("valid:", layout.valid);

  console.table(
    layout.elements.map((element) => ({
      id: element.id,
      role: element.role,
      visible: element.visible,
      x: Math.round(element.rect.x),
      y: Math.round(element.rect.y),
      width: Math.round(element.rect.width),
      height: Math.round(element.rect.height),
      fontSize: element.fontSize
        ? Math.round(element.fontSize)
        : undefined,
    })),
  );

  console.table(layout.decisions);
}

function App() {
  const portrait = resolveLayout(adSpec, surfaces.mobilePortrait);
  const landscape = resolveLayout(adSpec, surfaces.mobileLandscape);
  const broadcast = resolveLayout(
    adSpec,
    surfaces.broadcastLowerThird,
  );
  const kiosk = resolveLayout(adSpec, surfaces.squareKiosk);

  printLayout("Mobile Portrait", portrait);
  printLayout("Mobile Landscape", landscape);
  printLayout("Broadcast Lower Third", broadcast);
  printLayout("Square Kiosk", kiosk);

  return (
    <main>
      <h1>LayoutForge</h1>
      <p>Constraint resolver is running.</p>
    </main>
  );
}

export default App;