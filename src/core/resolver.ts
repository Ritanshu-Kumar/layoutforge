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

  const priorities = [...new Set(
    spec.elements.map((element) => element.priority),
  )].sort((a, b) => b - a);

  const attempts = [
    ...priorities.reduce<{
      compression: number;
      removedPriorities: number[];
    }[][]>((allAttempts, _priority, index) => {
      if (index === priorities.length - 1) {
        return allAttempts;
      }

      const removedPriorities = priorities.slice(0, index + 1);

      allAttempts.push([
        { compression: 0.9, removedPriorities },
        { compression: 0.8, removedPriorities },
      ]);

      return allAttempts;
    }, []),
  ].flat();

  attempts.unshift(
    { compression: 1, removedPriorities: [] },
    { compression: 0.9, removedPriorities: [] },
    { compression: 0.8, removedPriorities: [] },
  );

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
      validateLayout(candidate.elements, surface, bounds, visibleSpec)
    ) {
      return {
        surface,
        elements: mergeHiddenElements(candidate.elements, spec.elements),
        decisions: [
          ...candidate.decisions,
          ...getHiddenDecisions(
            spec.elements,
            candidate.elements,
          ),
        ],
        valid: true,
      };
    }
  }

  const criticalPriority = Math.min(
    ...spec.elements.map((element) => element.priority),
  );
  const critical = spec.elements.filter(
    (element) => element.priority === criticalPriority,
  );

  const fallback = compose(
    critical,
    bounds,
    surface,
    composition,
    0.75,
  );
  const fallbackIsValid =
    hasAllElements(fallback.elements, critical) &&
    validateLayout(
      fallback.elements,
      surface,
      bounds,
      critical,
    );
  const fallbackElements = fallbackIsValid
    ? fallback.elements
    : [];

  return {
    surface,
    elements: mergeHiddenElements(
      fallbackElements,
      spec.elements,
    ),
    decisions: [
      ...fallback.decisions,
      ...getHiddenDecisions(spec.elements, fallbackElements),
    ],
    valid: fallbackIsValid,
  };
}

function compose(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  composition: Composition,
  compression: number,
): Candidate {
  let candidate: Candidate;

  switch (composition) {
    case "tall":
      candidate = composeTall(
        elements,
        bounds,
        surface,
        compression,
      );
      break;

    case "wide":
      candidate = composeWide(
        elements,
        bounds,
        surface,
        compression,
      );
      break;

    case "balanced":
      candidate = composeBalanced(
        elements,
        bounds,
        surface,
        compression,
      );
      break;
  }

  return {
    elements: appendUnplacedElements(
      candidate.elements,
      elements,
      bounds,
      surface,
      compression,
    ),
    decisions: candidate.decisions,
  };
}

function composeTall(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);
  const decisions: ResolutionDecision[] = [];

  const gap = Math.max(8, 14 * compression);

  const logo = firstRole(byRole, "branding");
  const headline = firstRole(byRole, "primary");
  const hero = firstRole(byRole, "hero");
  const price = firstRole(byRole, "secondary");
  const cta = firstRole(byRole, "action");

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

function composeWide(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);

  const hero = firstRole(byRole, "hero");
  const headline = firstRole(byRole, "primary");
  const price = firstRole(byRole, "secondary");
  const cta = firstRole(byRole, "action");
  const logo = firstRole(byRole, "branding");

  const gap = Math.max(12, 18 * compression);

  const result: ResolvedElement[] = [];

  const heroWidth = hero
    ? bounds.width * 0.24
    : 0;

  const logoWidth = logo
    ? Math.min(bounds.width * 0.12, 120 * compression)
    : 0;

  const contentX =
    bounds.x +
    heroWidth +
    (hero ? gap : 0);

  const contentWidth =
    bounds.width -
    heroWidth -
    logoWidth -
    gap * ((hero ? 1 : 0) + (logo ? 1 : 0));

  const headerHeight = headline
    ? Math.max(
        minimumHeight(headline, surface),
        70 * compression,
      )
    : 0;

  const footerHeight =
    price || cta
      ? Math.max(
          ...[price, cta]
            .filter(
              (element): element is AdElement =>
                Boolean(element),
            )
            .map((element) =>
              minimumHeight(element, surface),
            ),
          60 * compression,
        )
      : 0;

  if (hero) {
    const heroSize = Math.min(
      heroWidth * 0.9,
      bounds.height * 0.82,
    );

    result.push(
      createResolved(
        hero,
        {
          x:
            bounds.x +
            (heroWidth - heroSize) / 2,
          y:
            bounds.y +
            (bounds.height - heroSize) / 2,
          width: heroSize,
          height: heroSize,
        },
        surface,
        compression,
      ),
    );
  }

  if (headline) {
    result.push(
      createResolved(
        headline,
        {
          x: contentX,
          y: bounds.y,
          width: contentWidth,
          height: headerHeight,
        },
        surface,
        compression,
      ),
    );
  }

  const footerElements = [price, cta].filter(
    (element): element is AdElement =>
      Boolean(element),
  );

  if (footerElements.length > 0) {
    const footerGap = Math.max(
      10,
      14 * compression,
    );

    const totalGap =
      footerGap *
      (footerElements.length - 1);

    const footerWidth =
      (contentWidth - totalGap) /
      footerElements.length;

    const footerY =
      bounds.y +
      bounds.height -
      footerHeight;

    footerElements.forEach((element, index) => {
      result.push(
        createResolved(
          element,
          {
            x:
              contentX +
              index * (footerWidth + footerGap),
            y: footerY,
            width: footerWidth,
            height: footerHeight,
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
          x:
            bounds.x +
            bounds.width -
            logoWidth,
          y:
            bounds.y +
            (bounds.height - 48 * compression) / 2,
          width: logoWidth,
          height: 48 * compression,
        },
        surface,
        compression,
      ),
    );
  }

  return {
    elements: result,
    decisions: [],
  };
}

function composeBalanced(
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): Candidate {
  const byRole = roleMap(elements);

  const headline = firstRole(byRole, "primary");
  const hero = firstRole(byRole, "hero");
  const price = firstRole(byRole, "secondary");
  const cta = firstRole(byRole, "action");
  const logo = firstRole(byRole, "branding");

  const gap = Math.max(12, 18 * compression);

  const result: ResolvedElement[] = [];

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
  const maxFontSize = element.constraints?.maxFontSize ?? Infinity;

  const preferredFontSize =
    element.role === "primary"
      ? 28
      : 18;

  const requestedFontSize = clamp(
    preferredFontSize * compression,
    minFontSize,
    maxFontSize,
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

  const fontSize = clamp(
    fitFontSize,
    minFontSize,
    maxFontSize,
  );

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
      ? Math.max(
          surface.minTapTarget ?? 1,
          element.constraints?.minTapTarget ?? 1,
        )
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
      ? Math.max(
          surface.minTapTarget ?? 1,
          element.constraints?.minTapTarget ?? 1,
        )
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

function validateLayout(
  elements: ResolvedElement[],
  surface: SurfaceProfile,
  bounds: Bounds,
  expected: AdElement[],
): boolean {
  const visible = elements.filter(
    (element) => element.visible,
  );
  const expectedById = new Map(
    expected.map((element) => [element.id, element]),
  );

  for (const element of visible) {
    const { x, y, width, height } = element.rect;
    const source = expectedById.get(element.id);

    if (!source || ![x, y, width, height].every(Number.isFinite)) {
      return false;
    }

    if (
      width <= 0 ||
      height <= 0 ||
      x < bounds.x ||
      y < bounds.y ||
      x + width > bounds.x + bounds.width ||
      y + height > bounds.y + bounds.height
    ) {
      return false;
    }

    const minimumWidthValue = minimumWidth(source, surface);
    const minimumHeightValue = minimumHeight(source, surface);

    if (width < minimumWidthValue || height < minimumHeightValue) {
      return false;
    }

    if (
      (element.type === "text" ||
        element.type === "button") &&
      (element.fontSize ?? 0) < Math.max(
        surface.minTextSize ?? 0,
        source.constraints?.minFontSize ?? 0,
      )
    ) {
      return false;
    }

    if (
      (element.type === "text" ||
        element.type === "button") &&
      source.constraints?.maxFontSize !== undefined &&
      (element.fontSize ?? 0) > source.constraints.maxFontSize
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
): Map<AdElement["role"], AdElement[]> {
  const roles = new Map<AdElement["role"], AdElement[]>();

  for (const element of elements) {
    const roleElements = roles.get(element.role) ?? [];
    roleElements.push(element);
    roles.set(element.role, roleElements);
  }

  return roles;
}

function firstRole(
  roles: Map<AdElement["role"], AdElement[]>,
  role: AdElement["role"],
): AdElement | undefined {
  return roles.get(role)?.[0];
}

function appendUnplacedElements(
  resolved: ResolvedElement[],
  elements: AdElement[],
  bounds: Bounds,
  surface: SurfaceProfile,
  compression: number,
): ResolvedElement[] {
  const placedIds = new Set(
    resolved.map((element) => element.id),
  );
  const unplaced = elements.filter(
    (element) => !placedIds.has(element.id),
  );
  let cursorY = bounds.y;

  for (const element of resolved) {
    cursorY = Math.max(cursorY, element.rect.y + element.rect.height);
  }

  for (const element of unplaced) {
    const gap = Math.max(8, 12 * compression);
    const width = Math.min(
      bounds.width,
      Math.max(minimumWidth(element, surface), bounds.width * 0.25),
    );
    const height = Math.min(
      bounds.height,
      Math.max(minimumHeight(element, surface), bounds.height * 0.12),
    );

    resolved.push(
      createResolved(
        element,
        {
          x: bounds.x,
          y: cursorY + gap,
          width,
          height,
        },
        surface,
        compression,
      ),
    );

    cursorY += gap + height;
  }

  return resolved;
}

function mergeHiddenElements(
  visible: ResolvedElement[],
  all: AdElement[],
): ResolvedElement[] {
  const visibleIds = new Set(
    visible.map((element) => element.id),
  );

  const hidden = all
    .filter((element) => !visibleIds.has(element.id))
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
  visible: Array<Pick<AdElement, "id">>,
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
    !Number.isFinite(surface.width) ||
    !Number.isFinite(surface.height) ||
    surface.width <= 0 ||
    surface.height <= 0
  ) {
    throw new Error(
      "Surface dimensions must be positive.",
    );
  }

  if (
    surface.minTapTarget !== undefined &&
    (!Number.isFinite(surface.minTapTarget) ||
      surface.minTapTarget <= 0)
  ) {
    throw new Error(
      "minTapTarget must be positive.",
    );
  }

  if (
    surface.minTextSize !== undefined &&
    (!Number.isFinite(surface.minTextSize) ||
      surface.minTextSize <= 0)
  ) {
    throw new Error(
      "minTextSize must be positive.",
    );
  }

  const safe = surface.safeArea;

  if (safe) {
    const values = [
      safe.top,
      safe.right,
      safe.bottom,
      safe.left,
    ];

    if (
      values.some((value) =>
        !Number.isFinite(value) || value < 0,
      ) ||
      safe.left + safe.right >= surface.width ||
      safe.top + safe.bottom >= surface.height
    ) {
      throw new Error(
        "Safe-area insets must be finite, non-negative, and leave a positive layout area.",
      );
    }
  }
}

function validateSpec(
  spec: AdSpec,
): void {
  if (!spec || !Array.isArray(spec.elements) || spec.elements.length === 0) {
    throw new Error(
      "Ad spec must contain at least one element.",
    );
  }

  const ids = new Set<string>();

  for (const element of spec.elements) {
    if (!element.id || ids.has(element.id)) {
      throw new Error("Ad spec element ids must be unique and non-empty.");
    }

    ids.add(element.id);

    if (!Number.isInteger(element.priority) || element.priority < 1) {
      throw new Error(`Invalid priority for "${element.id}".`);
    }

    if (!element.content.trim()) {
      throw new Error(`Element "${element.id}" must have content.`);
    }

    const constraints = element.constraints;
    const numericConstraints = [
      constraints?.minWidth,
      constraints?.minHeight,
      constraints?.preferredWidth,
      constraints?.preferredHeight,
      constraints?.minFontSize,
      constraints?.maxFontSize,
      constraints?.minTapTarget,
    ];

    if (numericConstraints.some(
      (value) => value !== undefined && !Number.isFinite(value),
    )) {
      throw new Error(`Constraints for "${element.id}" must be finite.`);
    }

    if (
      (constraints?.minWidth ?? 0) < 0 ||
      (constraints?.minHeight ?? 0) < 0 ||
      (constraints?.preferredWidth ?? 1) <= 0 ||
      (constraints?.preferredHeight ?? 1) <= 0 ||
      (constraints?.minFontSize ?? 1) <= 0 ||
      (constraints?.maxFontSize ?? 1) <= 0 ||
      (constraints?.minTapTarget ?? 1) <= 0 ||
      (constraints?.minFontSize !== undefined &&
        constraints.maxFontSize !== undefined &&
        constraints.minFontSize > constraints.maxFontSize) ||
      (constraints?.minWidth !== undefined &&
        constraints.preferredWidth !== undefined &&
        constraints.minWidth > constraints.preferredWidth) ||
      (constraints?.minHeight !== undefined &&
        constraints.preferredHeight !== undefined &&
        constraints.minHeight > constraints.preferredHeight)
    ) {
      throw new Error(`Invalid constraints for "${element.id}".`);
    }
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