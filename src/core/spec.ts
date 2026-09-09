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
      if (
        constraints.minWidth !== undefined &&
        constraints.minWidth < 0
      ) {
        throw new Error(`Invalid minWidth for "${element.id}".`);
      }

      if (
        constraints.minHeight !== undefined &&
        constraints.minHeight < 0
      ) {
        throw new Error(`Invalid minHeight for "${element.id}".`);
      }

      if (
        constraints.preferredWidth !== undefined &&
        constraints.preferredWidth <= 0
      ) {
        throw new Error(`Invalid preferredWidth for "${element.id}".`);
      }

      if (
        constraints.preferredHeight !== undefined &&
        constraints.preferredHeight <= 0
      ) {
        throw new Error(`Invalid preferredHeight for "${element.id}".`);
      }
    }

    if (element.type === "button" && element.constraints?.minFontSize === 0) {
      throw new Error(`Button "${element.id}" cannot have a zero font size.`);
    }
  }

  return {
    elements: [...elements],
  };
}