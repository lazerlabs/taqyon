# AGENTS.md

## Project Purpose

Taqyon is a CLI for scaffolding cross-platform desktop apps that pair a Qt/C++ backend with a web frontend (React, Vue, or Svelte in JS or TS). It is conceptually similar to Tauri, but instead of the OS webview it uses Qt WebEngine (Chromium-based) and bridges the frontend to C++ via QWebChannel. Compared to Electron, it keeps the renderer consistent across platforms while using a native C++/Qt backend instead of Node as the host runtime.

## Key Concepts

- **Renderer:** Qt WebEngine (Chromium-based), not the OS WebView.
- **Bridge:** QWebChannel for frontend-backend communication.
- **Fallback:** If WebEngine is missing, the backend template falls back to a basic Qt Widgets UI.

## Repo Layout

- `cli/index.js`: CLI entry point (commander + inquirer).
- `cli/create-app.js`: scaffolding flow.
- `cli/file-utils.js`, `cli/qt-utils.js`: filesystem and Qt detection helpers.
- `templates/frontend/`: framework + language templates (`react-js`, `react-ts`, `vue-js`, `vue-ts`, `svelte-js`, `svelte-ts`).
- `templates/src-taqyon/`: Qt/C++ backend template (CMake, app, backend object, build helpers).
- `docs/`: documentation hub and deeper guides.
- `examples/`: sample projects (e.g., `hello-react-counter`).

## Development Commands

- `npm start`: run frontend dev server + backend app concurrently.
- `npm run build`: build frontend + backend.
- `npm run frontend:dev`: frontend only.
- `npm run frontend:build`: frontend build only.
- `npm run app:build`: backend build only.
- `npm run app:run`: run compiled backend.

## Documentation Expectations

- Keep wording consistent: Qt WebEngine is Chromium-based; Tauri uses the OS WebView; Electron bundles Chromium with a JS runtime.
- Emphasize that Taqyon is a **CLI scaffolder** for Qt/C++ + web frontends with QWebChannel integration.
- When changing templates or CLI prompts, update `README.md` and `docs/` accordingly.
