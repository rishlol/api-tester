# API Tester

A lightweight HTTP request builder — a mini Postman built with vanilla TypeScript and Vite. Runs as a web app or as a native desktop app via Tauri.

## Features

- **Method selector** — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, each color-coded
- **Query params** — key/value editor with per-row enable/disable toggles; active count shown in tab badge
- **Request headers** — same key/value editor as params
- **Request body** — supports JSON (with a Format button), plain text, and URL-encoded form data
- **Auth** — No Auth, Bearer Token, or Basic Auth (username/password)
- **Response viewer**
  - Status badge color-coded by range (2xx green, 3xx blue, 4xx yellow, 5xx red)
  - Elapsed time and response size
  - Pretty view with JSON syntax highlighting
  - Raw view for plain text responses
  - Headers table listing all response headers
  - One-click copy to clipboard
- **No CORS restrictions** when running as the desktop app (requests go through Tauri's native Rust HTTP client)

## Getting Started

### Web (browser)

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> Note: browser requests are subject to CORS restrictions. Test against local APIs or APIs that explicitly allow cross-origin requests.

### Desktop app (Tauri)

Requires the [Rust toolchain](https://rustup.rs) and Xcode Command Line Tools (macOS).

```bash
bun install
bun run tauri:dev     # opens the native window, hot-reloads on save
bun run tauri:build   # produces a .app / .dmg in src-tauri/target/release/bundle
```

## Scripts

| Command               | Description                                  |
|-----------------------|----------------------------------------------|
| `bun run dev`         | Start Vite dev server (web)                  |
| `bun run build`       | Type-check and build frontend for production |
| `bun run preview`     | Preview the production web build             |
| `bun run tauri:dev`   | Launch the desktop app in development mode   |
| `bun run tauri:build` | Build and bundle the desktop app             |

## Tech Stack

- [Tauri v2](https://tauri.app) — native desktop wrapper (Rust + system WebView)
- [Vite](https://vite.dev) — build tool and dev server
- Vanilla TypeScript — no framework, no runtime dependencies
- CSS custom properties for theming

## Built with

Developed using [Cursor](https://cursor.com) (AI-assisted IDE).
