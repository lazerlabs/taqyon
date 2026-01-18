# Taqyon Documentation

This section provides detailed documentation for various aspects of the Taqyon CLI and project structure. Taqyon scaffolds Qt/C++ backends paired with web frontends that run inside Qt WebEngine (Chromium-based) and communicate via QWebChannel.

## Table of Contents

*   **Frontend-Backend Communication**
    *   [Frontend-Backend Communication with QWebChannel](./frontend-backend-communication.md) - Explains JS/C++ communication via QWebChannel using the counter example for React, Vue, and Svelte.

*   **Backend (C++)**
    *   [Backend Counter Implementation (C++)](./backend-counter-implementation.md) - Details the C++ `BackendObject` implementation for the counter example.

---

## 🧩 App Architecture & Extensibility

The Qt/C++ backend template is designed for modularity and extensibility. Key UI features and their structure:

- **Menu Bar:** The main window includes a minimal menu bar with a "Help" menu and an "About" action.
- **About Dialog:** Selecting "About" opens a dialog with application information.
- **System Tray Icon:** A system tray icon is present while the app is running, providing "Show" (restores the main window) and "Quit" actions for user convenience.
- **Modular Structure:**
  - The main window and all UI logic are encapsulated in the `MainWindow` class (`app/mainwindow.h`, `app/mainwindow.cpp`).
  - Application setup logic (initialization, configuration) is separated into `app_setup.h` and `app_setup.cpp` for clarity and easier extension.

These features provide a robust starting point for building more complex Qt/C++ backends. You can extend the menu, dialogs, or tray actions by modifying the respective classes.


> **Note:**
> All frontend frameworks (React, Vue, Svelte) support both JavaScript and TypeScript.
> You can select your preferred language when creating a project.
> See the main [README.md](../README.md) for details on language selection and template naming.

For a general overview and quick start, please refer to the main [README.md](../README.md) in the root directory.
