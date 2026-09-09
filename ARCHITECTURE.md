# LayoutForge Architecture

## Overview

LayoutForge separates content definition, constraint resolution, and rendering.

```text
Ad Specification
       |
       v
Constraint Resolver
       |
       v
Resolved Layout
       |
       v
DOM Renderer
```

The resolver is framework-agnostic. React is used only to render the resolved geometry.

## Core Components

### Ad Specification

The ad specification describes content and intent without knowing the target surface.

Each element contains:

- id
- type
- role
- priority
- content
- optional sizing constraints

The same specification is reused across every surface.

### Surface Profile

A surface describes environmental constraints rather than a predefined layout.

Examples include:

- width and height
- safe area
- minimum tap target
- minimum text size
- viewing distance
- touch-only behavior

A new surface can therefore be added without modifying the resolver.

### Constraint Resolver

The resolver follows a deterministic pipeline:

1. Validate specification and surface
2. Calculate safe-area bounds
3. Select a composition from surface geometry
4. Attempt a preferred composition with the available space
5. Validate hard constraints
6. Compress the composition if necessary
7. Remove lower-priority content when necessary
8. Re-resolve the remaining elements
9. Validate the final layout

Composition is selected from the available geometry and aspect ratio rather than from surface names.

### Composition Strategy

Three generic compositions are currently supported:

**Tall**

Tall surfaces use a vertical hierarchy:

```text
Logo
Headline
Hero image
Price + CTA
```

**Wide**

Wide surfaces use horizontal regions:

```text
Hero | Content | Branding
```

**Balanced**

Balanced surfaces use:

```text
Headline + Branding
       Hero
   Price + CTA
```

These compositions are derived from aspect ratio, not surface-specific identifiers.

### Priority and Degradation

Elements have numeric priorities.

Lower numeric values represent more important content.

The resolver attempts to preserve higher-priority elements when constraints become impossible to satisfy.

The degradation strategy is:

```text
Preferred layout
      |
      v
Compression
      |
      v
Remove priority-3 content
      |
      v
Remove priority-2 content
      |
      v
Retain priority-1 content
```

Hard constraints are checked during resolution. A layout is only returned as valid when the visible elements satisfy the supported surface constraints, including:

- minimum text size
- minimum tap target
- surface bounds
- non-overlapping geometry

### Resolved Layout

The resolver produces a `ResolvedLayout` containing:

- resolved element rectangles
- visibility
- font size
- resolution decisions
- validity status

The renderer does not need to understand how the layout was calculated.

### Rendering

The DOM renderer consumes only the resolved layout.

This separation allows another rendering backend, such as Canvas, to reuse the same resolver without changing the constraint-resolution algorithm.

## Invariants

A valid layout must satisfy — every visible element:

- has positive dimensions
- remains inside surface bounds
- satisfies hard constraints
- does not overlap another visible element

## Extension

A fifth surface can be introduced by creating a new `SurfaceProfile`.

No resolver branch is required for a new surface identity.

The resolver derives composition from geometric characteristics such as aspect ratio and applies the constraints supplied by the new profile:

```ts
const ratio = bounds.width / bounds.height;
```

followed by generic geometry thresholds. The resolver operates entirely on the profile's constraints and geometry — never on a surface's name or ID.