---
description: General coding guidelines for the Crumb project. Apply to all code changes, bug fixes, and feature work across the codebase.
applyTo: "**"
---

# Crumb — Copilot Instructions

## Project

Crumb is a real-time collaborative infinite canvas built with **Next.js 15 (App Router)**, **TypeScript**, **Fabric.js 7**, **Liveblocks**, and **Tailwind CSS v4**. The board is the primary surface; most logic lives in `src/components/DrawingBoard/hooks/`.

## Before Completing Any Task

After making code changes, **always**:

1. **Check TypeScript errors** — run `npx tsc --noEmit` and resolve all errors before considering the task done.
2. **Verify the build passes** — run `npm run build` and fix any build failures before considering the task done.

Do not mark work as complete or summarise changes until both checks pass cleanly.

## Code Style

- TypeScript strict mode is enabled. Avoid `any` where possible; use explicit types or type assertions with a comment when unavoidable.
- `"use client"` must be declared at the top of any file that uses React hooks or browser APIs.
- Prefer editing existing files over creating new abstractions. Do not add helpers, wrappers, or utilities unless they are reused in at least two places.
- Do not add comments, docstrings, or type annotations to code you did not change.
- Keep Fabric.js interactions inside the `DrawingBoard/hooks/` layer; do not leak Fabric types into UI components.

## Testing

- Unit tests live in `src/__tests__/` and use **Vitest**.
- E2E tests live in `e2e/` and use **Playwright**.
- Run `npm test` to execute unit tests; `npm run test:e2e` for end-to-end.
- Add or update tests when fixing bugs in tested modules.
