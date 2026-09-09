import type {
  AdElement,
  AdSpec,
  Rect,
  ResolutionDecision,
  ResolvedElement,
  ResolvedLayout,
  SurfaceProfile,
} from "./types";

type Composition = "tall" | "wide" | "balanced";

interface Bounds extends Rect {}

interface Candidate {
  elements: ResolvedElement[];
  decisions: ResolutionDecision[];
}

export function resolveLayout(
  spec: AdSpec,
  surface: SurfaceProfile,
): ResolvedLayout {
  validateSpec(spec);
  validateSurface(surface);

  const bounds = getSafeBounds(surface);
  const composition = chooseComposition(bounds);

  /*
   * Try progressively stronger degradation.
   *
   * We never violate hard minimums. When a layout still cannot fit,
   * lower-priority elements are removed and the remaining elements
   * are resolved again from scratch.
   */
  const attempts = [
    { compression: 1, removedPriorities: [] as number[] },
    { compression: 0.9, removedPriorities: [] as number[] },
    { compression: 0.8, removedPriorities: [] as number[] },
    { compression: 0.9, removedPriorities: [3] },
    { compression: 0.8, removedPriorities: [3] },
    { compression: 0.9, removedPriorities: [3, 2] },
    { compression: 0.8, removedPriorities: [3, 2] },
  ];

  for (const attemptConfig of attempts) {
    const visibleSpec = spec.elements.filter(
      (element) =>
        !attemptConfig.removedPriorities.includes(element.priority),
    );

    const candidate = compose(
      visibleSpec,
      bounds,
      surface,
      composition,
      attemptConfig.compression,
    );

    if (
      hasAllElements(candidate.elements, visibleSpec) &&
      validateLayout(candidate.elements, surface)
    ) {
      return {
        surface,
        elements: mergeHiddenElements(
          candidate.elements,
          spec.elements,
          visibleSpec,
        ),
        decisions: [
          ...candidate.decisions,
          ...getHiddenDecisions(
            spec.elements,
            visibleSpec,
          ),
        ],
        valid: true,
      };
    }
  }

  /*
   * Final fallback: retain only priority-1 elements.
   * Priority-1 content is never silently removed.
   */
  const critical = spec.elements.filter(
    (element) => element.priority === 1,
  );

  const fallback = compose(
    critical,
    bounds,
    surface,
    composition,
    0.75,
  );

  return {
    surface,
    elements: mergeHiddenElements(
      fallback.elements,
      spec.elements,
      critical,
    ),
    decisions: [
      ...fallback.decisions,
      ...getHiddenDecisions(spec.elements, critical),
    ],
    valid: validateLayout(fallback.elements, surface),
  };
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                */
/* -------------------------------------------------------------------------- */

function compose(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  composition: Composition,
  compression: number,
): Candidate {
  switch (composition) {
    case "tall":
      return composeTall(
        elements,
        bounds,
        surface,
        compression,
      );

    case "wide":
      return composeWide(
        elements,
        bounds,
        surface,
        compression,
      );

    case "balanced":
      return composeBalanced(
        elements,
        bounds,
        surface,
        compression,
      );
  }
}

/*
 * Tall:
 *
 * ┌────────────────────┐
 * │       LOGO         │
 * ├────────────────────┤
 * │      HEADLINE      │
 * ├────────────────────┤
 * │                    │
 * │       IMAGE        │
 * │                    │
 * ├────────────────────┤
 * │ PRICE │    CTA     │
 * └────────────────────┘
 */
function composeTall(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);
  const decisions: ResolutionDecision[] = [];

  const gap = Math.max(8, 14 * compression);

  const logo = byRole.get("branding");
  const headline = byRole.get("primary");
  const hero = byRole.get("hero");
  const price = byRole.get("secondary");
  const cta = byRole.get("action");

  let y = bounds.y;
  const result: ResolvedElement[] = [];

  if (logo) {
    const height = clamp(
      34 * compression,
      minimumHeight(logo, surface),
      bounds.height,
    );

    result.push(
      createResolved(
        logo,
        {
          x: bounds.x,
          y,
          width: Math.min(
            bounds.width * 0.3,
            preferredWidth(logo, bounds) * compression,
          ),
          height,
        },
        surface,
        compression,
      ),
    );

    y += height + gap;
  }

  if (headline) {
    const height = clamp(
      preferredHeight(headline, bounds) * compression,
      minimumHeight(headline, surface),
      bounds.height,
    );

    result.push(
      createResolved(
        headline,
        {
          x: bounds.x,
          y,
          width: bounds.width,
          height,
        },
        surface,
        compression,
      ),
    );

    y += height + gap;
  }

  if (hero) {
    const remainingHeight = Math.max(
      0,
      bounds.y + bounds.height - y,
    );

    const reservedFooter =
      (price || cta ? 64 : 0) + (price || cta ? gap : 0);

    const availableHeroHeight = Math.max(
      minimumHeight(hero, surface),
      remainingHeight - reservedFooter,
    );

    const heroSize = Math.min(
      bounds.width * 0.8,
      availableHeroHeight,
    );

    result.push(
      createResolved(
        hero,
        {
          x: bounds.x + (bounds.width - heroSize) / 2,
          y,
          width: heroSize,
          height: heroSize,
        },
        surface,
        compression,
      ),
    );

    y += heroSize + gap;
  }

  const footer = [price, cta].filter(
    (element): element is AdElement => Boolean(element),
  );

  if (footer.length > 0) {
    const width =
      (bounds.width - gap * (footer.length - 1)) /
      footer.length;

    footer.forEach((element, index) => {
      const minWidth = minimumWidth(element, surface);

      result.push(
        createResolved(
          element,
          {
            x: bounds.x + index * (width + gap),
            y,
            width: Math.max(width, minWidth),
            height: Math.max(
              56 * compression,
              minimumHeight(element, surface),
            ),
          },
          surface,
          compression,
        ),
      );
    });
  }

  return {
    elements: result,
    decisions,
  };
}

/*
 * Wide:
 *
 * ┌────────┬─────────────────────────┬─────────┐
 * │ IMAGE  │ HEADLINE / PRICE / CTA │  LOGO   │
 * └────────┴─────────────────────────┴─────────┘
 */
function composeWide(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);
  const decisions: ResolutionDecision[] = [];

  const gap = Math.max(12, 20 * compression);

  const hero = byRole.get("hero");
  const headline = byRole.get("primary");
  const price = byRole.get("secondary");
  const cta = byRole.get("action");
  const logo = byRole.get("branding");

  const heroWidth = hero
    ? Math.max(
        minimumWidth(hero, surface),
        bounds.width * 0.25,
      )
    : 0;

  const logoWidth = logo
    ? Math.max(
        minimumWidth(logo, surface),
        Math.min(bounds.width * 0.12, 130),
      )
    : 0;

  const contentWidth =
    bounds.width -
    heroWidth -
    logoWidth -
    gap * ((hero ? 1 : 0) + (logo ? 1 : 0));

  const result: ResolvedElement[] = [];

  if (hero) {
    result.push(
      createResolved(
        hero,
        {
          x: bounds.x,
          y: bounds.y,
          width: heroWidth,
          height: bounds.height,
        },
        surface,
        compression,
      ),
    );
  }

  const contentElements = [
    headline,
    price,
    cta,
  ].filter(
    (element): element is AdElement => Boolean(element),
  );

  if (contentElements.length > 0) {
    const contentGap = Math.max(
      8,
      12 * compression,
    );

    const rowHeight =
      (bounds.height -
        contentGap * (contentElements.length - 1)) /
      contentElements.length;

    contentElements.forEach((element, index) => {
      result.push(
        createResolved(
          element,
          {
            x:
              bounds.x +
              heroWidth +
              (hero ? gap : 0),
            y:
              bounds.y +
              index * (rowHeight + contentGap),
            width: Math.max(
              minimumWidth(element, surface),
              contentWidth,
            ),
            height: Math.max(
              minimumHeight(element, surface),
              rowHeight,
            ),
          },
          surface,
          compression,
        ),
      );
    });
  }

  if (logo) {
    result.push(
      createResolved(
        logo,
        {
          x: bounds.x + bounds.width - logoWidth,
          y: bounds.y,
          width: logoWidth,
          height: Math.min(
            44 * compression,
            bounds.height,
          ),
        },
        surface,
        compression,
      ),
    );
  }

  return {
    elements: result,
    decisions,
  };
}

/*
 * Balanced:
 *
 * ┌──────────────────────┐
 * │ HEADLINE         LOGO│
 * │                      │
 * │        IMAGE         │
 * │                      │
 * │ PRICE          CTA   │
 * └──────────────────────┘
 */
function composeBalanced(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);

  const headline = byRole.get("primary");
  const hero = byRole.get("hero");
  const price = byRole.get("secondary");
  const cta = byRole.get("action");
  const logo = byRole.get("branding");

  const gap = Math.max(12, 18 * compression);

  const result: ResolvedElement[] = [];

  // --- Header -------------------------------------------------------------

  const headerHeight = headline
    ? Math.max(
        minimumHeight(headline, surface),
        72 * compression,
      )
    : 0;

  const logoWidth = logo
    ? Math.min(120, bounds.width * 0.2)
    : 0;

  if (headline) {
    result.push(
      createResolved(
        headline,
        {
          x: bounds.x,
          y: bounds.y,
          width:
            bounds.width -
            (logo ? logoWidth + gap : 0),
          height: headerHeight,
        },
        surface,
        compression,
      ),
    );
  }

  if (logo) {
    result.push(
      createResolved(
        logo,
        {
          x:
            bounds.x +
            bounds.width -
            logoWidth,
          y: bounds.y,
          width: logoWidth,
          height: headerHeight,
        },
        surface,
        compression,
      ),
    );
  }

  // --- Footer -------------------------------------------------------------

  const footer = [price, cta].filter(
    (element): element is AdElement => Boolean(element),
  );

  const footerHeight =
    footer.length > 0
      ? Math.max(
          ...footer.map((element) =>
            minimumHeight(element, surface),
          ),
          64 * compression,
        )
      : 0;

  // --- Hero area ----------------------------------------------------------

  const heroTop =
    bounds.y +
    headerHeight +
    (headline || logo ? gap : 0);

  const heroBottom =
    bounds.y +
    bounds.height -
    footerHeight -
    (footer.length > 0 ? gap : 0);

  const heroAvailableHeight = Math.max(
    0,
    heroBottom - heroTop,
  );

  if (hero) {
    const heroSize = Math.min(
      bounds.width * 0.48,
      heroAvailableHeight,
    );

    if (
      heroSize >=
      minimumHeight(hero, surface)
    ) {
      result.push(
        createResolved(
          hero,
          {
            x:
              bounds.x +
              (bounds.width - heroSize) / 2,
            y:
              heroTop +
              (heroAvailableHeight - heroSize) / 2,
            width: heroSize,
            height: heroSize,
          },
          surface,
          compression,
        ),
      );
    }
  }

  // --- Footer -------------------------------------------------------------

  if (footer.length > 0) {
    const footerGap = Math.max(
      10,
      14 * compression,
    );

    const totalGap =
      footerGap * (footer.length - 1);

    const columnWidth =
      (bounds.width - totalGap) /
      footer.length;

    footer.forEach((element, index) => {
      result.push(
        createResolved(
          element,
          {
            x:
              bounds.x +
              index * (columnWidth + footerGap),
            y:
              bounds.y +
              bounds.height -
              footerHeight,
            width: columnWidth,
            height: footerHeight,
          },
          surface,
          compression,
        ),
      );
    });
  }

  return {
    elements: result,
    decisions: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Element sizing                                                             */
/* -------------------------------------------------------------------------- */

function createResolved(
  element: AdElement,
  rect: Rect,
  surface: SurfaceProfile,
  compression: number,
): ResolvedElement {
  const minFontSize = Math.max(
    element.constraints?.minFontSize ?? 0,
    surface.minTextSize ?? 12,
  );

  const preferredFontSize =
    element.role === "primary"
      ? 28
      : 18;

  const requestedFontSize = Math.max(
    minFontSize,
    preferredFontSize * compression,
  );

  const estimatedCharactersPerLine = Math.max(
    8,
    Math.floor(rect.width / (requestedFontSize * 0.55)),
  );

  const estimatedLines =
    element.type === "text"
      ? Math.ceil(
          element.content.length /
            estimatedCharactersPerLine,
        )
      : 1;

  const estimatedTextHeight =
    estimatedLines * requestedFontSize * 1.15;

  const availableTextHeight = Math.max(
    rect.height - 12,
    minFontSize * 1.15,
  );

  const fitFontSize =
    element.type === "text" &&
    estimatedTextHeight > availableTextHeight
      ? Math.max(
          minFontSize,
          availableTextHeight /
            (estimatedLines * 1.15),
        )
      : requestedFontSize;

  const fontSize = fitFontSize;

  return {
    id: element.id,
    type: element.type,
    role: element.role,
    rect,
    visible: true,
    fontSize:
      element.type === "text" || element.type === "button"
        ? fontSize
        : undefined,
    content: element.content,
  };
}

function minimumWidth(
  element: AdElement,
  surface: SurfaceProfile,
): number {
  const elementMinimum =
    element.constraints?.minWidth ?? 1;

  const tapMinimum =
    element.type === "button"
      ? surface.minTapTarget ?? 1
      : 1;

  return Math.max(
    elementMinimum,
    tapMinimum,
  );
}

function minimumHeight(
  element: AdElement,
  surface: SurfaceProfile,
): number {
  const elementMinimum =
    element.constraints?.minHeight ?? 1;

  const tapMinimum =
    element.type === "button"
      ? surface.minTapTarget ?? 1
      : 1;

  return Math.max(
    elementMinimum,
    tapMinimum,
  );
}

function preferredWidth(
  element: AdElement,
  bounds: Bounds,
): number {
  return (
    element.constraints?.preferredWidth ??
    bounds.width * 0.25
  );
}

function preferredHeight(
  element: AdElement,
  bounds: Bounds,
): number {
  return (
    element.constraints?.preferredHeight ??
    bounds.height * 0.15
  );
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validateLayout(
  elements: ResolvedElement[],
  surface: SurfaceProfile,
): boolean {
  const visible = elements.filter(
    (element) => element.visible,
  );

  for (const element of visible) {
    const { x, y, width, height } = element.rect;

    if (
      width <= 0 ||
      height <= 0 ||
      x < 0 ||
      y < 0 ||
      x + width > surface.width ||
      y + height > surface.height
    ) {
      return false;
    }

    if (
      element.type === "button" &&
      surface.minTapTarget !== undefined &&
      (width < surface.minTapTarget ||
        height < surface.minTapTarget)
    ) {
      return false;
    }

    if (
      (element.type === "text" ||
        element.type === "button") &&
      surface.minTextSize !== undefined &&
      (element.fontSize ?? 0) < surface.minTextSize
    ) {
      return false;
    }
  }

  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      if (
        overlaps(
          visible[i].rect,
          visible[j].rect,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function hasAllElements(
  resolved: ResolvedElement[],
  expected: AdElement[],
): boolean {
  const resolvedIds = new Set(
    resolved.map((element) => element.id),
  );

  return expected.every((element) => resolvedIds.has(element.id));
}

function overlaps(
  a: Rect,
  b: Rect,
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function chooseComposition(
  bounds: Bounds,
): Composition {
  const ratio = bounds.width / bounds.height;

  if (ratio >= 1.8) {
    return "wide";
  }

  if (ratio <= 0.8) {
    return "tall";
  }

  return "balanced";
}

function roleMap(
  elements: AdElement[],
): Map<AdElement["role"], AdElement> {
  return new Map(
    elements.map((element) => [
      element.role,
      element,
    ]),
  );
}

function mergeHiddenElements(
  visible: ResolvedElement[],
  all: AdElement[],
  included: AdElement[],
): ResolvedElement[] {
  const includedIds = new Set(
    included.map((element) => element.id),
  );

  const hidden = all
    .filter((element) => !includedIds.has(element.id))
    .map((element) => ({
      id: element.id,
      type: element.type,
      role: element.role,
      rect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      visible: false,
      content: element.content,
    }));

  return [...visible, ...hidden];
}

function getHiddenDecisions(
  all: AdElement[],
  visible: AdElement[],
): ResolutionDecision[] {
  const visibleIds = new Set(
    visible.map((element) => element.id),
  );

  return all
    .filter((element) => !visibleIds.has(element.id))
    .map((element) => ({
      elementId: element.id,
      action: "hidden" as const,
      reason:
        `Priority ${element.priority} content was removed because the available surface could not satisfy all hard constraints.`,
    }));
}

function getSafeBounds(
  surface: SurfaceProfile,
): Bounds {
  const safe = surface.safeArea ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return {
    x: safe.left,
    y: safe.top,
    width:
      surface.width -
      safe.left -
      safe.right,
    height:
      surface.height -
      safe.top -
      safe.bottom,
  };
}

function validateSurface(
  surface: SurfaceProfile,
): void {
  if (
    surface.width <= 0 ||
    surface.height <= 0
  ) {
    throw new Error(
      "Surface dimensions must be positive.",
    );
  }

  if (
    surface.minTapTarget !== undefined &&
    surface.minTapTarget <= 0
  ) {
    throw new Error(
      "minTapTarget must be positive.",
    );
  }

  if (
    surface.minTextSize !== undefined &&
    surface.minTextSize <= 0
  ) {
    throw new Error(
      "minTextSize must be positive.",
    );
  }
}

function validateSpec(
  spec: AdSpec,
): void {
  if (spec.elements.length === 0) {
    throw new Error(
      "Ad spec must contain at least one element.",
    );
  }
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}