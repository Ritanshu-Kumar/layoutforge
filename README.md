# LayoutForge

Constraint-based adaptive layout resolution for multi-surface advertising.

LayoutForge takes a single declarative advertisement specification and resolves it into valid layouts for surfaces with fundamentally different dimensions and constraints.

## Why

The same advertising content may need to appear on:

- mobile portrait screens
- mobile landscape screens
- broadcast lower-thirds
- square interactive kiosks

Instead of maintaining a separate layout for each surface, LayoutForge uses a constraint-driven resolver to derive the composition from the available geometry and surface constraints.

## Architecture

```text
Ad Spec
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

The resolver is plain TypeScript and is independent of React. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Features

- Single declarative ad specification
- Constraint-based layout resolution
- Priority-aware degradation
- Safe-area support
- Minimum tap-target constraints
- Minimum text-size constraints
- Overlap detection
- Bounds validation
- Four required surface profiles
- Unknown-surface resolution
- Interactive surface picker
- Automated resolver tests

## Demo

The demo uses one ad specification containing:

- headline
- product image
- price
- CTA
- branding

The same specification is resolved against multiple surface profiles.

Available profiles include:

- Mobile Portrait
- Mobile Landscape
- Broadcast Lower Third
- Square Kiosk
- Constrained surface

Use the surface selector to see the resolver recompute the layout.

## Resolution Algorithm

The resolver follows this process:

```text
Ad Spec + Surface Profile
          |
          v
    Validate inputs
          |
          v
    Calculate safe bounds
          |
          v
   Select composition
          |
          v
Attempt a preferred composition
   with the available space
          |
          v
 Validate hard constraints
          |
       +--+--+
       |     |
      pass  fail
       |     |
       v     v
     return  degrade
               |
               v
          re-resolve
```

Composition is chosen from the surface geometry.

The resolver does not contain surface-specific branches such as:

```ts
if (surface.id === "mobilePortrait")
```

Instead, surfaces provide dimensions and constraints, and the same resolution algorithm operates on them.

## Priority & Degradation

Elements have numeric priorities. Priority 1 content is considered critical.

When the preferred composition cannot satisfy all constraints, the resolver progressively degrades the layout:

1. Compress the composition.
2. Remove the lowest-priority priority tier.
3. Re-resolve the remaining elements.
4. Continue until the layout becomes valid or only critical content remains.

Priority values are data-driven; the resolver does not assume specific numeric tiers.

Hard constraints are checked during resolution. A layout is only returned as valid when the visible elements satisfy the supported surface constraints.

For example, a touch surface may require:

```text
minimum tap target = 60px
```

and a broadcast surface may require:

```text
minimum text size = 32px
```

The resolver accounts for these constraints when determining whether a layout is valid.

## TypeScript Design

Core types include:

- `AdSpec`
- `AdElement`
- `SurfaceProfile`
- `ResolvedElement`
- `ResolvedLayout`
- `ResolutionDecision`

The output is explicitly typed so rendering code can consume position, size, visibility, and typography without guessing.

## Testing

The resolver tests cover:

- valid layouts across required surfaces
- bounds safety
- overlap safety
- broadcast text-size constraints
- kiosk tap-target constraints
- different layouts across aspect ratios
- previously unseen surfaces

Run tests with:

```bash
npm test
```

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Project Structure

```text
src/
├── core/
│   ├── types.ts
│   ├── spec.ts
│   ├── surfaces.ts
│   └── resolver.ts
├── rendering/
│   └── render-dom.tsx
├── demo/
│   └── ad-spec.ts
├── App.tsx
└── main.tsx

tests/
└── resolver.test.ts

ARCHITECTURE.md
README.md
```

## Known Limitations

The current implementation intentionally keeps the layout model small.

Limitations include:

- fixed element type set
- no animation between surface changes
- no browser text measurement in the resolver
- no Canvas rendering backend
- limited typography-aware wrapping

These are extension points rather than requirements for the core resolver.


## Time Spent

Approximately 3 days, including implementation, testing, debugging, and documentation.


## AI Tool Disclosure

AI tools were used during development for:

- architecture discussion
- implementation assistance
- debugging
- test-case generation
- documentation drafting

The final implementation was reviewed and tested locally, and the resolver design is intended to be explainable independently of the AI assistance.