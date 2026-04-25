# DBML Hub

A Next.js app that visualizes DBML and PostgreSQL schemas as interactive diagrams using React Flow.

## 🚀 Features

- **Interactive DBML & SQL Visualization**: Convert DBML and PostgreSQL schema code into interactive diagrams
- **Dual Mode Interface**: Switch between editor and diagram views seamlessly
- **Auto-layout**: Automatic diagram positioning using Dagre layout algorithm
- **Export Options**: Export diagrams as PNG or SVG files
- **Real-time Updates**: Debounced parsing for smooth typing experience
- **Modern Tech Stack**: Built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui

## 🛠️ Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Diagrams**: React Flow (@xyflow/react) v12 with custom table nodes and relationship edges
- **Parsing**: @dbml/core for DBML, node-sql-parser for SQL
- **Layout**: Dagre for automatic graph positioning
- **State Management**: Zustand for client-side state
- **Export**: html-to-image for PNG/SVG export
- **TypeScript**: Strict mode with path aliases
- **Testing**: Vitest with React Testing Library

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

## 🖥️ Development

```bash
# Start development server
pnpm dev
# or
npm run dev

# Opens http://localhost:3000
```

## 🏗️ Production Build

```bash
# Build for production
pnpm build
# or
npm run build

# Start production server
pnpm start
# or
npm run start
```

## 🧪 Testing

```bash
# Run tests in watch mode
pnpm test
# or
npm run test

# Run tests once (CI)
pnpx vitest run

# Run single test file
pnpx vitest run tests/parsers/dbml-parser.test.ts
```

## 🔍 Linting

```bash
pnpm lint
# or
npm run lint
```

## 📁 Project Structure

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

## 🔧 Adding New Parser/Transformer

1. Add parser logic to `lib/parsers/<name>-parser.ts`
2. Add transformer to `lib/transformers/<name>-to-flow.ts` (produces `{ nodes, edges }` for React Flow)
3. Update `ViewPage.tsx` to route `inputType` to the new parser
4. Add tests mirroring existing parser/transformer test patterns

## ⚠️ Common Pitfalls

- **React Flow Styles**: Must import `'@xyflow/react/dist/style.css'` in any component mounting `ReactFlow`
- **Client Components**: All feature components are marked `'use client'` since they use hooks, Zustand, and React Flow
- **Debounced Parsing**: `ViewPage` debounces parse at 300ms — don't expect instant diagram updates while typing

## 🌐 Browser Support

Works in all modern browsers that support:
- CSS Grid & Flexbox
- ES6+ JavaScript Features
- Canvas API (for export functionality)

## 🙏 Acknowledgments

- [@dbml/core](https://github.com/dbml-js/dbml) for DBML parsing
- [@xyflow/react](https://xyflow.dev/) for the powerful React Flow library
- [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components