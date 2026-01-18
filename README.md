# Taqyon CLI – Scaffold Qt/C++ + JS/TS Desktop Apps (Tauri-style)

Taqyon is a CLI tool for rapidly scaffolding cross-platform desktop applications with a modern JavaScript or TypeScript frontend (React, Vue, or Svelte—your choice) and a native Qt/C++ backend. Inspired by Tauri, Taqyon orchestrates both parts for seamless development, build, and packaging. Instead of the OS webview, it targets Qt WebEngine (Chromium-based), giving a consistent renderer across platforms and a QWebChannel bridge to the C++ backend.
**You can select either JavaScript or TypeScript for your frontend at project creation.**

---

## ⚡ Quick Start

Follow these steps to create a new desktop application with Taqyon:

1. **Install Taqyon CLI globally (recommended):**
   ```sh
   git clone https://github.com/your-org/taqyon.git
   cd taqyon
   npm install
   npm install -g .
   ```

   Or use `npx` directly (no global install needed):
   ```sh
   npx taqyon create-app
   ```

2. **Create a new application:**
   ```sh
   taqyon create-app
   # or
   npx taqyon create-app
   ```
   - You'll be prompted for:
     - Project name (will create a NEW directory with this name)
     - Scaffold frontend? (Y/n)
     - Scaffold backend? (Y/n)
     - Frontend framework (React, Vue, Svelte)
     - **Frontend language (JavaScript or TypeScript)**
     - Qt6 installation path (if not detected automatically)

     > **Frontend language:**
     > Choose between JavaScript and TypeScript for your frontend. This determines the template used (e.g., `react-js` or `react-ts`) and the language of all generated frontend files.

3. **Navigate to your newly created project directory:**
   ```sh
   cd your-project-name
   ```

4. **Install dependencies:**
   ```sh
   npm install
   cd src && npm install && cd ..
   ```

5. **Run the application:**
   ```sh
   npm start
   ```

### ⚠️ Common Issues

- **"No such file or directory" error**: Make sure you're running npm commands from within your generated project directory, not the Taqyon tool directory.
- **"Qt6 not found" error**: The CLI attempts to detect Qt6 automatically. If not found, you'll be prompted to provide the path.
- **"WebEngineWidgets not found"**: The backend will automatically fall back to a basic Qt UI if WebEngine modules aren't available in your Qt installation.
- **Missing frontend**: If you chose to skip frontend scaffolding, you shouldn't run frontend-related scripts like `npm run frontend:dev`.

---

## 🖥️ About Qt WebEngine Fallback

Taqyon is designed to work with Qt6's WebEngine module for rendering web content, but not all Qt installations include this component. To ensure maximum compatibility:

1. **Automatic Detection**: During project creation, Taqyon attempts to find Qt6 on your system.
2. **Fallback Mechanism**: The generated CMakeLists.txt first tries to find WebEngine components, but falls back to basic Qt widgets if not available.
3. **Two Entry Points**: 
   - `main.cpp`: Used when WebEngine is available (loads web content)
   - `main_basic.cpp`: Used when WebEngine is not available (displays native Qt UI)

This approach ensures your app will build with any Qt6 installation, even without WebEngine support.

---

## 🚀 Purpose

- **Rapidly bootstrap** a new desktop app with a minimal Qt/C++ backend and a modern JavaScript or TypeScript frontend (your choice at project creation).
- **Unified workflow:** One CLI, one project structure, cross-platform scripts.
- **Customizable:** Choose your frontend framework and language, skip frontend/backend, and extend as needed.
- **Consistent rendering:** Qt WebEngine provides a Chromium-based runtime (similar to Electron’s renderer, but driven by a C++/Qt backend rather than Node).
- **Modern native UI features:** Includes a minimal menu bar (Help > About), a working About dialog, and a system tray icon with Show and Quit actions.

---

## 📦 Prerequisites

- **Node.js** (v16+ recommended)
- **npm** (v8+)
- **CMake** (v3.16+)
- **Qt 6** (Core and Widgets modules required; WebEngineWidgets and WebChannel are optional but recommended)
- **Git** (recommended for version control)

> **Platform notes:**  
> - On Windows, ensure `cmake` and `Qt` are in your PATH.  
> - On macOS/Linux, install Qt via [qt.io](https://www.qt.io/download) or your package manager.

---

## 🛠️ Installation

Clone this repository and install dependencies:

```sh
git clone https://github.com/your-org/taqyon.git
cd taqyon
npm install
npm install -g .
```

Or use `npx` for one-off project scaffolding:

```sh
npx taqyon create-app
```

---

## ⚖️ License

Taqyon is dual-licensed under your choice of the [MIT License](./LICENSE_MIT) or the [Apache License 2.0](./LICENSE_APACHE-2.0).

This means you can choose the license that best suits your needs.

SPDX-License-Identifier: MIT OR Apache-2.0

---

## 🏗️ Creating a New Project

Run the CLI to scaffold a new project:

```sh
taqyon create-app
# or
npx taqyon create-app
```

You'll be prompted for:
- **Project name** (required)
- **Scaffold frontend?** (Y/n)
- **Scaffold backend?** (Y/n)
- **Frontend framework** (React, Vue, Svelte; defaults to React)
- **Frontend language** (JavaScript or TypeScript)
- **Qt6 installation path** (if not detected automatically)

### Example Interactive Session

```
$ taqyon create-app
Taqyon CLI - Project Scaffolding
? Project name: my-app
? Scaffold frontend? (Y/n): y
? Scaffold backend? (Y/n): y
? Select a frontend framework: (Use arrow keys)
❯ React
  Vue
  Svelte
# (User selects Vue, for example)
? Select frontend language: (Use arrow keys)
❯ TypeScript
  JavaScript
# (User selects TypeScript, for example)
Copied Vue template from templates/frontend/vue-ts to src/
Frontend scaffolding complete: src/ (vue-ts)

Qt6 found at: /path/to/qt6
Created build helper script: src-taqyon/build.sh
Backend scaffolding complete:
  src-taqyon/CMakeLists.txt
  src-taqyon/app/main.cpp
  src-taqyon/backend/backendobject.h
  src-taqyon/backend/backendobject.cpp

Project scaffolded successfully!
Navigate to your project with: cd my-app
Run 'npm install' to install dependencies if needed
Run 'npm start' to start development
Done.
```

### Expected Directory Structure

```
my-app/
  src/                # Frontend (Vite app root)
    ...               # One template is created here (React/Vue/Svelte + JS/TS)
  src-taqyon/         # Qt/C++ backend
    CMakeLists.txt    # Build configuration
    app/
      main.cpp        # Main file (with WebEngine)
      mainwindow.h    # MainWindow class: main app window, menu bar, About dialog, tray icon
      mainwindow.cpp
      app_setup.h     # App setup helpers (separates setup logic from UI)
      app_setup.cpp
    backend/
      backendobject.h
      backendobject.cpp
    build.sh/bat      # Build script with correct Qt path
  .taqyonrc           # Stores detected Qt path
  package.json        # Scripts for both parts
  README.md
```

> **Template directory naming:**
> The `src/` directory is populated from the selected template, e.g., `react-ts`, `vue-js`, or `svelte-ts`.
> - `<framework>`: `react`, `vue`, or `svelte`
> - `<language>`: `js` (JavaScript) or `ts` (TypeScript)
> Only the chosen combination is created.


---

## 🧩 App Structure & UI Features

The generated Qt/C++ backend is now modular and includes several native UI features out of the box:

- **Menu Bar:** Minimal menu bar with a "Help" menu and an "About" action.
- **About Dialog:** Clicking "About" opens a dialog with app information.
- **System Tray Icon:** A tray icon is shown when the app is running, with "Show" (restores the window) and "Quit" actions.
- **Modular Code:** The main window and UI logic are encapsulated in the `MainWindow` class (`app/mainwindow.h`, `app/mainwindow.cpp`). Application setup logic is separated into `app_setup.h` and `app_setup.cpp` for clarity and extensibility.

These features provide a solid foundation for further customization and extension of your Qt/C++ backend.


## ⚙️ CLI Options

- **Default:** Prompts for all options interactively, including frontend language (JavaScript or TypeScript).
- **Advanced (planned):**
  - `--skip-frontend` – Scaffold only backend
  - `--skip-backend` – Scaffold only frontend
  - (See [docs/cli_workflow_and_structure.md](docs/cli_workflow_and_structure.md) for details and future CLI flags)

---

## 📜 npm Scripts

| Script              | Description                                                                                 | Cross-Platform? |
|---------------------|---------------------------------------------------------------------------------------------|-----------------|
| `npm start`         | Runs frontend dev server and backend build/run concurrently                                 | ✅              |
| `npm run build`     | Builds frontend and backend                                                                | ✅              |
| `frontend:dev`      | Starts frontend dev server                                                                 | ✅              |
| `frontend:build`    | Builds frontend                                                                            | ✅              |
| `app:build`         | Builds backend using CMake with correct Qt path                                            | ✅              |
| `app:run`           | Runs backend binary                                                                        | ✅              |
| `app:run:dev`       | Runs backend against a frontend dev server (default `http://127.0.0.1:5173`)               | ✅              |
| `dev`               | Picks an available dev port and runs frontend + backend together                            | ✅              |

- Scripts use `concurrently`, `cross-env`, and `wait-on` for platform compatibility.
- `npm run dev` picks an available port (up to 5 attempts) and launches both frontend and backend with the same URL.
- `npm start` waits for the frontend to be ready before launching the backend.

> **Note:**
> If you chose to skip frontend scaffolding when creating your project, only use backend-related scripts.
> If you chose to skip backend scaffolding, only use frontend-related scripts.
> If you run `npm run app:run:dev`, start `npm run frontend:dev` in another terminal first (or use `npm run dev` to launch both together).

---

## 🧑‍💻 Example Workflow

```sh
# Scaffold a new project
taqyon create-app
# or
npx taqyon create-app

# Enter your project directory
cd my-app

# Install dependencies
npm install
cd src && npm install && cd ..

# Build and run both parts
npm start
```

---

## 🛠️ Troubleshooting & Platform Notes

- **Qt not found:**  
  If Qt6 wasn't detected during project creation:
- Edit `.taqyonrc` to update the Qt6 path
- Edit `src-taqyon/build.sh` or `src-taqyon/build.bat` with the correct path

- **CMake errors:**  
  Check that CMake is installed and up to date. Use `cmake --version` to verify.

- **Missing Qt WebEngine modules:**  
  The backend will automatically fall back to a basic Qt UI if WebEngine modules aren't available. No action needed.

- **"Could not read package.json" error when running `npm start`:**
This occurs if you run `npm start` or other frontend-related scripts but the `src/` directory doesn't exist.
  **Solution:**
    - Only run backend-related scripts if you skipped frontend scaffolding
    - Only run frontend-related scripts if you skipped backend scaffolding

- **Port conflicts:**  
  The backend expects the frontend dev server at `localhost:5173`. Change the port in frontend config if needed and update `main.cpp` accordingly.

- **Windows-specific:**  
  Use Git Bash or WSL for a Unix-like shell, or ensure all tools are in your system PATH.

---

## 📚 Further Documentation

For detailed guides, API references, and advanced topics, please see the [Taqyon Documentation Hub](./docs/README.md).

Key topics include:
- CLI Workflow and Structure
- Frontend-Backend Communication (QWebChannel, Counter Example for React/Vue/Svelte, in both JavaScript and TypeScript)
- Backend C++ Implementation (Counter Example)
- Qt Setup and Build Processes

(Previously listed individual files can be found linked within the [Documentation Hub](./docs/README.md))

---

## 🗨️ Feedback & Contributions

Contributions, bug reports, and feature requests are welcome!  
Open an issue or PR on GitHub.

---
