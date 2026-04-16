# API Tester

A lightweight browser-based HTTP request builder — a mini Postman built with vanilla TypeScript and Vite.

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
- CORS-aware error messages with actionable hints

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command           | Description                     |
|-------------------|---------------------------------|
| `bun run dev`     | Start local dev server          |
| `bun run build`   | Type-check and build for prod   |
| `bun run preview` | Preview the production build    |

## Tech Stack

- [Vite](https://vite.dev) — build tool and dev server
- Vanilla TypeScript — no framework, no runtime dependencies
- CSS custom properties for theming

## Built with

Developed using [Cursor](https://cursor.com) (AI-assisted IDE).

## Notes

Requests are sent directly from the browser via `fetch`. Some public APIs block cross-origin requests (CORS). For the best experience, test against local APIs or APIs that explicitly allow browser requests (e.g. `jsonplaceholder.typicode.com`).
