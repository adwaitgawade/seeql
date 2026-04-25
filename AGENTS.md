# DBML Hub

A Next.js app that visualizes DBML and PostgreSQL schemas as interactive diagrams using React Flow.

## Developer Commands

```bash
# Install dependencies (both package-lock.json and pnpm-lock.yaml exist)
pnpm install  # preferred if pnpm is available
npm install   # fallback

# Dev server
pnpm dev      # or npm run dev — opens http://localhost:3000

# Production build
pnpm build    # or npm run build

# Run tests
pnpm test     # or npm run test — runs vitest in watch mode by default

# Run tests once (CI)
pnpx vitest run

# Lint
pnpm lint     # or npm run lint — uses ESLint flat config
```

## App Entry Point

The real app is at **`/app/view/page.tsx`** (renders `ViewPage` component).
Root `/app/page.tsx` is currently a placeholder — the viewer lives under `/view`.

## Architecture

```
app/
  view/page.tsx          # Main route — wraps ViewPage in Suspense
components/
  dbml-viewer/           # Feature components (ViewPage, DiagramTab, EditorTab, TableNode, etc.)
  ui/                    # shadcn/ui primitives (button, card, input, textarea)
lib/
  parsers/               # DBML parser (@dbml/core) and SQL parser (node-sql-parser)
  transformers/          # Convert parsed schemas → React Flow nodes/edges
  layout/                # dagre auto-layout for graph positioning
  store/                 # Zustand client-side state
  utils.ts               # cn() utility for Tailwind class merging
types/
  viewer.ts              # Shared types (ParsedSchema, TableNodeData, etc.)
tests/                   # Mirrors lib/ structure; setup at tests/setup.ts
```

## Tech Stack Quirks

- **Next.js 16 + React 19** — uses App Router, `reactCompiler: true` in `next.config.ts`
- **Tailwind CSS v4** — uses `@import "tailwindcss"` in `app/globals.css`, no `tailwind.config.js`. Theme variables defined via `@theme inline`.
- **PostCSS** — uses `@tailwindcss/postcss` plugin (v4 style)
- **shadcn/ui** — configured with `"style": "radix-nova"`, `"rsc": true`, `"tsx": true`. Add components via `npx shadcn@latest add <component>`.
- **State** — Zustand (`lib/store/viewer-store.ts`) for viewer state; URL search params sync tab state (`?tab=editor|diagram`).
- **Diagrams** — `@xyflow/react` v12 with custom `tableNode` and `relationshipEdge` types. Layout via `dagre`.
- **Export** — PNG/SVG via `html-to-image` targeting `.react-flow__viewport`.

## Testing

- **Vitest** with `jsdom` environment, `@testing-library/react`, `@testing-library/jest-dom`
- Setup file: `tests/setup.ts`
- Path alias `@/` resolves to project root (configured in both `tsconfig.json` and `vitest.config.ts`)
- Run single test file: `pnpx vitest run tests/parsers/dbml-parser.test.ts`

## TypeScript / Path Aliases

- `@/*` maps to `./*` — usable in both app code and tests
- Strict mode enabled
- `jsx: "react-jsx"`

## Environment & Constraints

- **Node.js**: Use modern Node (Next 16 requires Node 18.18+).
- **Package manager**: Both `package-lock.json` and `pnpm-lock.yaml` exist; no `packageManager` field in `package.json`. Prefer `pnpm` if available.
- **No CI/CD** configured (no `.github/` directory).
- **No database** — purely client-side parsing and visualization.

## Adding a New Parser / Transformer

1. Add parser logic to `lib/parsers/<name>-parser.ts`
2. Add transformer to `lib/transformers/<name>-to-flow.ts` (produces `{ nodes, edges }` for React Flow)
3. Update `ViewPage.tsx` to route `inputType` to the new parser
4. Add tests mirroring existing parser/transformer test patterns

## Common Pitfalls

- **React Flow styles**: Must import `'@xyflow/react/dist/style.css'` in any component mounting `ReactFlow`.
- **Client components**: All feature components are marked `'use client'` since they use hooks, Zustand, and React Flow.
- **Debounced parsing**: `ViewPage` debounces parse at 300ms — don't expect instant diagram updates while typing.
