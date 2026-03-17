# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install deps + prisma generate + migrate (first-time setup)
npm run dev            # Start dev server with Turbopack at localhost:3000
npm run build          # Production build
npm run test           # Run all tests (vitest)
npx vitest run src/lib/__tests__/file-system.test.ts  # Run a single test file
npm run db:reset       # Reset database (destructive)
npx prisma migrate dev # Apply schema changes
npx prisma generate    # Regenerate Prisma client after schema changes
```

## Environment

- `.env` requires `ANTHROPIC_API_KEY` for real AI generation. Without it, a `MockLanguageModel` is used that generates static Counter/Form/Card components.
- `JWT_SECRET` is optional (defaults to `"development-secret-key"`).

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates code via tool calls that modify an in-memory virtual file system, triggering real-time iframe previews.

### Core Data Flow

1. User submits a chat message → `POST /api/chat`
2. Server calls `streamText()` (Vercel AI SDK) with Claude + two tools:
   - `str_replace_editor` — create/view/edit files (view, create, str_replace, insert operations)
   - `file_manager` — rename/delete files
3. Tool call results stream back to the client
4. `ChatContext` intercepts tool calls via `onToolCall` → calls `FileSystemContext.handleToolCall()`
5. `VirtualFileSystem` (in-memory `Map`) updates
6. `PreviewFrame` detects changes → Babel transforms JSX in-browser → renders in sandboxed iframe

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`)
- In-memory `Map<string, FileNode>` — no files are written to disk
- Serialized as JSON string and stored in `Project.data` column for persistence
- All AI tool operations go through this class

**Language Model Provider** (`src/lib/provider.ts`)
- Returns Anthropic Claude Haiku 4.5 if `ANTHROPIC_API_KEY` is set, otherwise `MockLanguageModel`
- Mock simulates a 4-step generation flow for development/testing without API costs

**Preview Rendering** (`src/lib/transform/jsx-transformer.ts`)
- Uses `@babel/standalone` for in-browser JSX→JS transformation
- Generates an import map for `@/` path aliases
- CSS imports are extracted separately; missing imports produce empty placeholder components
- Output is set as iframe `srcdoc`

### State Management

- `FileSystemContext` — owns `VirtualFileSystem` instance + `refreshTrigger` counter
- `ChatContext` — wraps Vercel AI SDK `useChat()`, bridges tool calls to FileSystemContext
- Both contexts are initialized from project DB data on page load

### Authentication

JWT-based sessions via `jose`. Token stored in httpOnly cookie (`auth-token`, 7-day expiry). Middleware (`src/middleware.ts`) protects `/api/projects/*` and `/api/filesystem/*`. Anonymous users can use the app; their work (stored in `sessionStorage`) is transferred to a new project on sign-up.

### Database

SQLite via Prisma. Two models:
- `User` — email + bcrypt password
- `Project` — `messages` (JSON string array) + `data` (JSON string of serialized VirtualFileSystem); `userId` is nullable for anonymous projects

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json`).

### Testing

Tests use Vitest + jsdom + `@testing-library/react`. Test files are colocated in `__tests__/` directories next to the code they test.

## Code Style

- Use comments sparingly. Only comment complex code.
