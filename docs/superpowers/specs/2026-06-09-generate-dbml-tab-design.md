# Generate DBML Tab Design Spec

## Overview
Add a new "Generate DBML" tab to the SEEQL Viewer that helps users generate DBML from their PostgreSQL database by executing a SQL query and formatting the results.

## Goals
- Provide a convenient way for users to generate DBML from their PostgreSQL database
- Keep the workflow entirely in-browser (no server-side processing)
- Match existing UI patterns and conventions

## User Flow
1. User navigates to "Generate DBML" tab
2. User sees a pre-populated SQL query on the left side
3. User copies the query and executes it in their PostgreSQL database
4. User pastes the query results into the right textarea
5. User clicks "Format Results" button
6. Raw SQL output is replaced with formatted DBML
7. User can optionally send the formatted DBML to the Editor tab

## Architecture

### Components

#### GenerateDBMLTab Component
- **File**: `components/dbml-viewer/GenerateDBMLTab.tsx`
- **Type**: Client component (`'use client'`)
- **Layout**: Split pane (50/50) with query on left, results on right
- **State**: Uses Zustand store for persistence

#### Left Pane: SQL Query Display
- Read-only textarea with monospace font
- Contains the SQL query from `scripts/dbml/postgres/github/query.sql`
- "Copy to Clipboard" button using `navigator.clipboard.writeText()`
- Visual feedback when copied (button text changes temporarily)

#### Right Pane: Results Input
- Editable textarea for user to paste SQL output
- Initially empty with placeholder: "Paste your query results here..."
- After formatting, shows formatted DBML content
- Monospace font for consistency

#### Action Bar
- "Format Results" button - calls `formatDBML()` on the pasted text
- "Send to Editor" button (appears after formatting) - sends formatted DBML to Editor tab
- Status indicator: "Raw SQL" or "Formatted DBML"

### Formatting Logic
- **File**: `lib/formatters/dbml-formatter.ts`
- **Function**: `formatDBML(input: string): string`
- Port of `scripts/dbml/postgres/github/index.js` to pure TypeScript
- Handles:
  - Column splitting with proper indentation
  - Index splitting with proper indentation
  - Nested braces formatting
  - Backtick handling within attributes
- No file I/O, works entirely in-memory

### Store Updates
Add to `lib/store/viewer-store.ts`:
```typescript
// In ViewerState interface
generateDBMLResults: string;

// In actions
setGenerateDBMLResults: (text: string) => void;
```

### URL State
- Tab URL parameter: `?tab=generate-dbml`
- Update `ViewPage.tsx` to handle new tab type
- Sync tab state with URL on mount and navigation

## File Changes

### New Files
1. `components/dbml-viewer/GenerateDBMLTab.tsx` - Main tab component
2. `lib/formatters/dbml-formatter.ts` - DBML formatting logic

### Modified Files
1. `lib/store/viewer-store.ts` - Add `generateDBMLResults` state
2. `components/dbml-viewer/ViewPage.tsx` - Add tab handling

## UI Specifications

### Layout
```
+------------------------------------------+
|  Generate DBML                           |
+------------------------------------------+
| [SQL Query]          | [Results Input]   |
| (Read-only)          | (Editable)        |
|                      |                   |
| [Copy to Clipboard]  | [Format Results]  |
|                      | [Send to Editor]  |
+------------------------------------------+
```

### Styling
- Follow existing dark theme (zinc-900 backgrounds, zinc-100 text)
- Monospace fonts for code areas
- Consistent padding and spacing with other tabs
- Button styles matching existing CompareTab

### Responsive Behavior
- Split pane collapses to stacked layout on narrow screens
- Minimum height for textareas to ensure usability

## Testing
- Unit tests for `formatDBML()` function
- Component tests for GenerateDBMLTab
- Integration test for copy-to-clipboard functionality
- Test URL state sync

## Edge Cases
- Empty results textarea - disable "Format Results" button
- Invalid SQL output - show error message
- Already formatted content - allow re-formatting
- Large results - ensure performance with scrollable textarea

## Security Considerations
- No server-side execution of user-provided SQL
- SQL query is read-only and cannot be modified
- No file system access in browser environment
