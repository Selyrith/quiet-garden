# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build / Test / Lint

- **Dev server**: `pnpm run dev` — Vite at http://localhost:5174
- **Production build**: `pnpm run build` — outputs to `dist/`
- **Preview build**: `pnpm run preview`
- **Server**: `pnpm run server` — Node.js Express + Socket.IO, defaults to http://localhost:3002
- **Full stack**: `pnpm start` — runs server + client simultaneously via `concurrently`
- **Syntax check + build**: `pnpm run check` — `node --check` on every `server/*.js`, then `vite build`
- **Install**: `pnpm install` (or `npm install`)

## Code Style

- 2-space indentation (confirmed in existing code)
- ES modules: `"type": "module"`; import paths carry explicit `.js` extensions (e.g. `./scenes/GameScene.js`)
- Import order: external packages first, then `shared/`, then relative
- UI colors come from the unified system in `src/ui/ui-theme.js` (`UI.UNIFIED`) — do not hardcode new brand colors
- No formatter or linter is configured (no ESLint/Prettier/Biome) — match surrounding file style

## Testing

- No test framework is configured — add Vitest or Jest if tests are needed
- Visual testing via the Phaser canvas; manual testing: run `pnpm start` and verify both client (http://localhost:5174) and server (http://localhost:3002)

## Repo Etiquette

- Branch naming: `feature/*`, `bug/*`, `hotfix/*`
- Commit style: conventional commits when possible
- PR description: what changed, why, any behavioral effects
- Do not commit `.env` — copy `.env.example` and edit locally; `data/rooms.json` is gitignored (auto-created save file)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:3002` | Server URL for the client (Vite) |
| `PORT` | `3002` | Port for the Node.js server |

Copy `.env.example` to `.env` and edit as needed. `.env` is gitignored.

## Non-Obvious Gotchas

- `.env.example` lists `PORT=3001` but the server defaults to `3002` and Vite proxies `/socket.io` to `3002` — keep them consistent
- Server and client share `shared/` — changes there affect both sides
- Vite watch ignores `**/data/**` — save files won't trigger reloads
- Phaser 3.90.0 is pinned — don't upgrade without checking compatibility
- Socket.IO connection handling is in `server/index.js` and `shared/*.js`
- Rooms persist to `data/rooms.json` and expire after 7 days of inactivity
- PWA service worker registers only in prod (`import.meta.env.PROD`), not under Vite dev
- UI text and README are in Russian
