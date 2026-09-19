# LayoutForge

Constraint-based adaptive layout resolution for multi-surface advertising.

LayoutForge takes a single declarative advertisement specification and resolves it into valid layouts for surfaces with different dimensions and constraints.

## Why

The same advertising content may need to appear on:

- mobile portrait screens
- mobile landscape screens
- broadcast lower-thirds
- square interactive kiosks

Instead of maintaining a separate layout for each surface, LayoutForge uses a constraint-driven resolver to derive the composition from available geometry and surface constraints.

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

The resolver is plain TypeScript and independent of React. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design details.

## Core Features

- single declarative ad specification
- constraint-based layout resolution
- aspect-ratio-driven composition selection
- priority-aware degradation
- safe-area support
- minimum tap-target constraints
- minimum text-size constraints
- bounds and overlap validation
- four required surface profiles plus a constrained profile
- resolution of previously unseen surface profiles
- typed resolver output and resolution decisions
- interactive surface picker
- automated resolver tests

## Demo

The repository includes a Vite/React demo that resolves the same ad specification against multiple surface profiles.

Available profiles include:

- Mobile Portrait
- Mobile Landscape
- Broadcast Lower Third
- Square Kiosk
- Constrained Surface

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
     return  compress / degrade
                 |
                 v
        re-resolve remaining content
```

Composition is selected from surface geometry rather than surface identity. The resolver does not require branches such as:

```ts
if (surface.id === "mobilePortrait")
```

Surfaces provide dimensions and constraints; the same resolver operates on those inputs.

## Priority & Degradation

Elements have numeric priorities. Lower numeric values represent more important content.

When the preferred composition cannot satisfy all constraints, the resolver progressively degrades the layout by trying compressed variants and then removing lower-priority content before re-resolving the remaining elements.

Hard constraints are checked during resolution. A layout is only returned as valid when visible elements satisfy the supported constraints, including:

- minimum text size
- minimum tap target
- surface bounds
- non-overlapping geometry

## TypeScript Design

Core types include:

- `AdSpec`
- `AdElement`
- `SurfaceProfile`
- `ResolvedElement`
- `ResolvedLayout`
- `ResolutionDecision`

The resolver returns typed geometry, visibility, typography, and resolution decisions so rendering code does not need to infer layout behavior.

## Testing

The resolver test suite covers:

- valid layouts across required surfaces
- bounds safety
- overlap safety
- safe-area handling
- broadcast minimum text size
- kiosk minimum tap target
- different compositions across aspect ratios
- previously unseen surfaces
- priority-based degradation
- invalid specifications and surfaces
- impossible fallback elements
- duplicate-role elements

Run the checks with:

```bash
npm install
npm run lint
npm test
npm run build
```

The same checks run automatically in GitHub Actions for pull requests and pushes to `main`.

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

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
layoutforge/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── src/
│   ├── core/
│   │   ├── types.ts
│   │   ├── spec.ts
│   │   ├── surfaces.ts
│   │   └── resolver.ts
│   ├── rendering/
│   │   └── render-dom.tsx
│   ├── demo/
│   │   └── ad-spec.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── resolver.test.ts
├── ARCHITECTURE.md
├── index.html
├── package.json
├── README.md
└── LICENSE
```

## Known Limitations

The current implementation intentionally keeps the layout model small.

- fixed element type set (`text`, `image`, `button`)
- no animation between surface changes
- no browser text measurement in the resolver
- no Canvas rendering backend
- limited typography-aware wrapping

These are extension points rather than requirements for the core resolver.

## AI Tool Disclosure

AI tools were used during development for architecture discussion, implementation assistance, debugging, test-case generation, and documentation drafting. The resolver implementation was reviewed and tested locally.

## License

This project is licensed under the MIT License.
