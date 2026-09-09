import type { AdElement, AdSpec } from "./types";

export function defineAd(elements: AdElement[]): AdSpec {
  const ids = new Set<string>();

  for (const element of elements) {
    if (ids.has(element.id)) {
      throw new Error(`Duplicate element id: "${element.id}"`);
    }

    ids.add(element.id);

    if (!element.id.trim()) {
      throw new Error("Every element must have a non-empty id.");
    }

    if (!Number.isInteger(element.priority) || element.priority < 1) {
      throw new Error(
        `Invalid priority for "${element.id}". Priority must be a positive integer.`,
      );
    }

    if (!element.content.trim()) {
      throw new Error(`Element "${element.id}" must have content.`);
    }

    const constraints = element.constraints;

    if (constraints) {
      const values = [
        constraints.minWidth,
        constraints.minHeight,
        constraints.preferredWidth,
        constraints.preferredHeight,
        constraints.minFontSize,
        constraints.maxFontSize,
        constraints.minTapTarget,
      ];

      if (values.some(
        (value) => value !== undefined && !Number.isFinite(value),
      )) {
        throw new Error(`Constraints for "${element.id}" must be finite.`);
      }

      if (
        (constraints.minWidth ?? 0) < 0 ||
        (constraints.minHeight ?? 0) < 0 ||
        (constraints.preferredWidth ?? 1) <= 0 ||
        (constraints.preferredHeight ?? 1) <= 0 ||
        (constraints.minFontSize ?? 1) <= 0 ||
        (constraints.maxFontSize ?? 1) <= 0 ||
        (constraints.minTapTarget ?? 1) <= 0 ||
        (constraints.minFontSize !== undefined &&
          constraints.maxFontSize !== undefined &&
          constraints.minFontSize > constraints.maxFontSize) ||
        (constraints.minWidth !== undefined &&
          constraints.preferredWidth !== undefined &&
          constraints.minWidth > constraints.preferredWidth) ||
        (constraints.minHeight !== undefined &&
          constraints.preferredHeight !== undefined &&
          constraints.minHeight > constraints.preferredHeight)
      ) {
        throw new Error(`Invalid constraints for "${element.id}".`);
      }
    }
  }

  return {
    elements: [...elements],
  };
}