import { describe, expect, it } from "vitest";

import { resolveLayout } from "../src/core/resolver";
import { defineAd } from "../src/core/spec";
import { adSpec } from "../src/demo/ad-spec";
import { surfaces } from "../src/core/surfaces";

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

describe("LayoutForge resolver", () => {
  const requiredSurfaces = [
    surfaces.mobilePortrait,
    surfaces.mobileLandscape,
    surfaces.broadcastLowerThird,
    surfaces.squareKiosk,
  ];

  it.each(requiredSurfaces)(
    "produces a valid layout for $id",
    (surface) => {
      const layout = resolveLayout(adSpec, surface);

      expect(layout.valid).toBe(true);
    },
  );

  it.each(requiredSurfaces)(
    "keeps all visible elements inside the surface for $id",
    (surface) => {
      const layout = resolveLayout(adSpec, surface);

      for (const element of layout.elements.filter(
        (element) => element.visible,
      )) {
        expect(element.rect.x).toBeGreaterThanOrEqual(0);
        expect(element.rect.y).toBeGreaterThanOrEqual(0);

        expect(
          element.rect.x + element.rect.width,
        ).toBeLessThanOrEqual(surface.width);

        expect(
          element.rect.y + element.rect.height,
        ).toBeLessThanOrEqual(surface.height);
      }
    },
  );

  it.each(requiredSurfaces)(
    "never overlaps visible elements on $id",
    (surface) => {
      const layout = resolveLayout(adSpec, surface);

      const visible = layout.elements.filter(
        (element) => element.visible,
      );

      for (let i = 0; i < visible.length; i += 1) {
        for (let j = i + 1; j < visible.length; j += 1) {
          expect(
            overlaps(
              visible[i].rect,
              visible[j].rect,
            ),
          ).toBe(false);
        }
      }
    },
  );

  it("respects broadcast minimum text size", () => {
    const layout = resolveLayout(
      adSpec,
      surfaces.broadcastLowerThird,
    );

    const textElements = layout.elements.filter(
      (element) =>
        element.visible &&
        (element.type === "text" ||
          element.type === "button"),
    );

    for (const element of textElements) {
      expect(element.fontSize).toBeGreaterThanOrEqual(
        surfaces.broadcastLowerThird.minTextSize!,
      );
    }
  });

  it("respects kiosk minimum tap target", () => {
    const layout = resolveLayout(
      adSpec,
      surfaces.squareKiosk,
    );

    const buttons = layout.elements.filter(
      (element) =>
        element.visible &&
        element.type === "button",
    );

    for (const button of buttons) {
      expect(button.rect.width).toBeGreaterThanOrEqual(
        surfaces.squareKiosk.minTapTarget!,
      );

      expect(button.rect.height).toBeGreaterThanOrEqual(
        surfaces.squareKiosk.minTapTarget!,
      );
    }
  });

  it("produces different compositions for different aspect ratios", () => {
    const portrait = resolveLayout(
      adSpec,
      surfaces.mobilePortrait,
    );

    const landscape = resolveLayout(
      adSpec,
      surfaces.mobileLandscape,
    );

    const portraitHero = portrait.elements.find(
      (element) => element.id === "product-image",
    )!;

    const landscapeHero = landscape.elements.find(
      (element) => element.id === "product-image",
    )!;

    expect(portraitHero.rect.y).not.toBe(
      landscapeHero.rect.y,
    );

    expect(portraitHero.rect.width).not.toBe(
      landscapeHero.rect.width,
    );
  });

  it("can resolve an unknown surface without resolver changes", () => {
    const unknownSurface = {
      id: "interviewSurface",
      width: 700,
      height: 300,
      safeArea: {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
      },
      minTapTarget: 44,
      minTextSize: 20,
      viewingDistance: "normal" as const,
      touchOnly: true,
    };

    const layout = resolveLayout(
      adSpec,
      unknownSurface,
    );

    expect(layout.valid).toBe(true);
  });

  it("degrades the constrained surface without losing element records", () => {
    const layout = resolveLayout(adSpec, surfaces.constrained);

    expect(layout.elements).toHaveLength(adSpec.elements.length);
    expect(new Set(layout.elements.map((element) => element.id)).size)
      .toBe(adSpec.elements.length);
    expect(layout.elements.some((element) => !element.visible)).toBe(true);
  });

  it("removes arbitrary lower priorities in descending order", () => {
    const spec = defineAd([
      {
        id: "critical",
        type: "text",
        role: "primary",
        priority: 10,
        content: "Critical",
        constraints: { minHeight: 40 },
      },
      {
        id: "optional",
        type: "text",
        role: "secondary",
        priority: 40,
        content: "Optional",
        constraints: { minHeight: 160 },
      },
    ]);
    const layout = resolveLayout(spec, {
      id: "prioritySurface",
      width: 180,
      height: 100,
      safeArea: { top: 4, right: 4, bottom: 4, left: 4 },
      minTextSize: 12,
    });

    expect(layout.valid).toBe(true);
    expect(layout.elements.find((element) => element.id === "critical")?.visible)
      .toBe(true);
    expect(layout.elements.find((element) => element.id === "optional")?.visible)
      .toBe(false);
  });

  it("keeps visible elements inside the safe area", () => {
    const surface = {
      id: "safeSurface",
      width: 320,
      height: 240,
      safeArea: { top: 20, right: 30, bottom: 40, left: 50 },
      minTextSize: 12,
    };
    const layout = resolveLayout(adSpec, surface);

    for (const element of layout.elements.filter((item) => item.visible)) {
      expect(element.rect.x).toBeGreaterThanOrEqual(50);
      expect(element.rect.y).toBeGreaterThanOrEqual(20);
      expect(element.rect.x + element.rect.width).toBeLessThanOrEqual(290);
      expect(element.rect.y + element.rect.height).toBeLessThanOrEqual(200);
    }
  });

  it("rejects invalid safe areas and element constraints", () => {
    expect(() => resolveLayout(adSpec, {
      id: "invalidSafeArea",
      width: 100,
      height: 100,
      safeArea: { top: 60, right: 0, bottom: 50, left: 0 },
    })).toThrow();

    expect(() => defineAd([{
      id: "invalid",
      type: "text",
      role: "primary",
      priority: 1,
      content: "Invalid",
      constraints: { minFontSize: 20, maxFontSize: 12 },
    }])).toThrow();
  });

  it("represents impossible fallback elements explicitly as hidden", () => {
    const spec = defineAd([{
      id: "impossible",
      type: "image",
      role: "hero",
      priority: 1,
      content: "Impossible",
      constraints: { minWidth: 500, minHeight: 500 },
    }]);
    const layout = resolveLayout(spec, {
      id: "tinySurface",
      width: 100,
      height: 100,
    });

    expect(layout.valid).toBe(true);
    expect(layout.elements).toHaveLength(1);
    expect(layout.elements[0].visible).toBe(false);
  });

  it("does not overwrite elements that share a role", () => {
    const spec = defineAd([
      {
        id: "brand-a",
        type: "image",
        role: "branding",
        priority: 3,
        content: "A",
      },
      {
        id: "brand-b",
        type: "image",
        role: "branding",
        priority: 3,
        content: "B",
      },
    ]);
    const layout = resolveLayout(spec, {
      id: "duplicateRoleSurface",
      width: 400,
      height: 300,
    });

    expect(layout.elements.map((element) => element.id).sort()).toEqual([
      "brand-a",
      "brand-b",
    ]);
  });
});