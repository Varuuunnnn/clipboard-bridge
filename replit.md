# Clipboard Bridge

Clipboard Bridge moves text and images between devices through temporary, OTP-protected rooms with QR join links.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/clipboard-bridge/src/App.tsx` — single-page dashboard, room setup, clipboard capture, QR sharing, and item history
- `artifacts/clipboard-bridge/src/index.css` — shared visual theme and motion
- `artifacts/api-server/src/routes/clipboard.ts` — temporary room and clipboard item API
- `lib/api-spec/openapi.yaml` — source-of-truth API contract

## Architecture decisions

- Rooms are temporary and held in server memory for a fast, zero-cost first version; they expire automatically after 30 minutes.
- Clipboard images are encoded client-side as data URLs and limited by the API request size, avoiding paid file storage.
- The dashboard polls active rooms every five seconds so another device's updates appear without a persistent realtime service.

## Product

- Create a temporary room and share its six-digit OTP or QR join link.
- Join from another device with the OTP.
- Send text, paste text, paste images, upload images, copy/download shared items, and clear a room.
- Preserve the current room in session storage while the browser session remains open.

## User preferences

- Keep the app free to run and focused on a fast single-page dashboard.

## Gotchas

- Browser clipboard read/write requires a secure context and user permission; the UI provides manual paste/upload paths when access is unavailable.
- Restart both the API Server and Clipboard Bridge web workflows after backend or client dependency changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
