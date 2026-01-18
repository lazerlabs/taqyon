// ============================================================================
// Taqyon App Scaffolding Module
// ============================================================================

/**
 * @fileoverview
 * Scaffolds a new Taqyon app project (frontend, backend, Qt config, etc).
 * All user prompts use inquirer. All file and Qt operations use utility modules.
 * Exports a single async function: createApp.
 * No CLI argument parsing or subcommand logic is present.
 * Cross-platform and project-path-agnostic.
 */

import fs from 'fs';
import { spawnSync } from 'child_process';
import inquirer from 'inquirer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    copyDirRecursiveSync,
    copyDirRecursiveWithReplace,
    copyFileSyncWithDirs,
} from './file-utils.js';
import {
    detectQt6,
    getQtModuleStatus,
    QT_REQUIRED_MODULES,
    validateQtPath,
} from './qt-utils.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** @type {string} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'templates');

// ---------------------------------------------------------------------------
// Preflight Checks
// ---------------------------------------------------------------------------

/**
 * Check if a command exists on PATH.
 * @param {string} command
 * @returns {boolean}
 */
function commandExists(command) {
  const isWindows = process.platform === 'win32';
  const whichCmd = isWindows ? 'where' : 'which';
  const result = spawnSync(whichCmd, [command], { stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Print Qt install guidance with optional module list.
 * @param {string[]} missingModules
 */
function printQtInstallHints(missingModules = []) {
  const moduleLabels = {
    Core: 'Qt Core',
    Gui: 'Qt Gui',
    Widgets: 'Qt Widgets',
    Positioning: 'Qt Positioning',
    WebEngineCore: 'Qt WebEngine',
    WebEngineWidgets: 'Qt WebEngine',
    WebChannel: 'Qt WebChannel',
  };
  const missingLabels = Array.from(
    new Set(missingModules.map((name) => moduleLabels[name] || name))
  );
  if (missingLabels.length) {
    console.log(`  Missing modules: ${missingLabels.join(', ')}`);
  }
  console.log('  Install Qt 6 with the required desktop modules via:');
  console.log('  - Qt Online Installer: https://www.qt.io/download-qt-installer');
  console.log('  - Qt Maintenance Tool (Add/Remove Components)');
  console.log('  - CLI (aqtinstall) example:');
  console.log('    python -m pip install aqtinstall');
  console.log('    aqt install-qt <os> desktop <version> <arch> -m qtwebengine qtwebchannel qtpositioning');
  console.log('    Examples:');
  console.log('      mac:    aqt install-qt mac desktop 6.6.0 clang_64 -m qtwebengine qtwebchannel qtpositioning');
  console.log('      win:    aqt install-qt windows desktop 6.6.0 msvc2019_64 -m qtwebengine qtwebchannel qtpositioning');
  console.log('      linux:  aqt install-qt linux desktop 6.6.0 gcc_64 -m qtwebengine qtwebchannel qtpositioning');
}

/**
 * Run basic requirement checks and print actionable guidance.
 * @param {{scaffoldBackend: boolean}} options
 * @returns {{detectedQt6Path: string|null, qtModuleStatus: null|{found: Record<string, boolean>, missing: string[]}}}
 */
function runPreflightChecks({ scaffoldBackend }) {
  let detectedQt6Path = null;
  let qtModuleStatus = null;
  let hasCmake = true;
  let hasQt = true;
  let hasQtModules = true;

  console.log('\nPreflight checks:');

  if (!scaffoldBackend) {
    console.log('  Backend scaffolding skipped; backend checks not required.');
    return { detectedQt6Path, qtModuleStatus };
  }

  const cmakeAvailable = commandExists('cmake');
  hasCmake = cmakeAvailable;
  if (cmakeAvailable) {
    console.log('  CMake: OK');
  } else {
    console.log('  CMake: NOT FOUND');
    console.log('  Install CMake from https://cmake.org/download/ or your package manager.');
  }

  detectedQt6Path = detectQt6();
  if (!detectedQt6Path) {
    hasQt = false;
    hasQtModules = false;
    console.log('  Qt6: NOT DETECTED');
    printQtInstallHints(QT_REQUIRED_MODULES);
    return { detectedQt6Path, qtModuleStatus, hasCmake, hasQt, hasQtModules };
  }

  console.log(`  Qt6: ${detectedQt6Path}`);
  qtModuleStatus = getQtModuleStatus(detectedQt6Path);
  if (qtModuleStatus.missing.length > 0) {
    hasQtModules = false;
    console.log('  Qt modules: INCOMPLETE');
    printQtInstallHints(qtModuleStatus.missing);
  } else {
    console.log('  Qt modules: OK');
  }

  return { detectedQt6Path, qtModuleStatus, hasCmake, hasQt, hasQtModules };
}

// -----------------------------------------------------------------------------
// Main App Scaffolding Function
// -----------------------------------------------------------------------------

/**
 * Scaffolds a new Taqyon app project.
 * Prompts the user for project options, creates directories, copies templates,
 * detects Qt, and writes config/scripts.
 * @returns {Promise<void>}
 */
async function createApp() {
  console.log('Taqyon CLI - Project Scaffolding');

  // ---------------------------
  // 1. Prompt for Project Name
  // ---------------------------
  let projectName;
  try {
    ({ projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: (input) => !!input.trim() || 'Project name is required.',
      },
    ]));
  } catch (err) {
    console.error('Prompt failed:', err.message);
    process.exit(1);
  }

  // ---------------------------
  // 2b. Preflight checks
  // ---------------------------
  const preflight = runPreflightChecks({ scaffoldBackend });
  let detectedQt6Path = preflight.detectedQt6Path;
  let qtModuleStatus = preflight.qtModuleStatus;
  if (scaffoldBackend && (!preflight.hasQt || !preflight.hasQtModules)) {
    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Preflight checks reported missing requirements. Continue anyway?',
        default: false,
      },
    ]);
    if (!continueAnyway) {
      console.log('Aborting scaffolding due to missing requirements.');
      process.exit(1);
    }
  }

  // ---------------------------
  // 2. Prompt for Frontend/Backend
  // ---------------------------
  let scaffoldFrontend, scaffoldBackend;
  try {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'scaffoldFrontend',
        message: 'Scaffold frontend?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'scaffoldBackend',
        message: 'Scaffold backend?',
        default: true,
      },
    ]);
    scaffoldFrontend = answers.scaffoldFrontend;
    scaffoldBackend = answers.scaffoldBackend;
  } catch (err) {
    console.error('Prompt failed:', err.message);
    process.exit(1);
  }

  // ---------------------------
  // 3. Prompt for Frontend Framework
  // ---------------------------
  let frontendFramework = null;
  if (scaffoldFrontend) {
    try {
      const { selectedFramework } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFramework',
          message: 'Select a frontend framework:',
          choices: [
            { name: 'React', value: 'react' },
            { name: 'Vue', value: 'vue' },
            { name: 'Svelte', value: 'svelte' },
          ],
          default: 'react',
        },
      ]);
      frontendFramework = selectedFramework;
    } catch (err) {
      console.error('Prompt failed:', err.message);
      process.exit(1);
    }
  }

  // ---------------------------
  // 3b. Prompt for Frontend Language
  // ---------------------------
  let frontendLanguage = null;
  if (scaffoldFrontend) {
    try {
      const { selectedLanguage } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedLanguage',
          message: 'Select a frontend language:',
          choices: [
            { name: 'JavaScript', value: 'js' },
            { name: 'TypeScript', value: 'ts' },
          ],
          default: 'js',
        },
      ]);
      frontendLanguage = selectedLanguage;
    } catch (err) {
      console.error('Prompt failed:', err.message);
      process.exit(1);
    }
  }

  // ---------------------------
  // 4. Create Project Root Directory
  // ---------------------------
  const projectRoot = path.resolve(process.cwd(), projectName);
  try {
    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create project directory:', err.message);
    process.exit(1);
  }

  // ---------------------------
  // 5. Scaffold Frontend
  // ---------------------------
  if (scaffoldFrontend) {
    try {
      const frontendDir = path.join(projectRoot, 'src');
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }
      // Copy template based on framework
      // Determine template directory based on framework and language
      const templateDirName = `${frontendFramework}-${frontendLanguage}`;
      const frontendTemplateDir = path.join(TEMPLATE_DIR, 'frontend', templateDirName);
      if (!fs.existsSync(frontendTemplateDir)) {
        throw new Error(`Frontend template directory not found: ${frontendTemplateDir}`);
      }
      // Use variable replacement for React and Svelte, plain copy for Vue
      if (frontendFramework === 'react' || frontendFramework === 'svelte') {
        copyDirRecursiveWithReplace(frontendTemplateDir, frontendDir, { projectName });
      } else {
        copyDirRecursiveSync(frontendTemplateDir, frontendDir);
      }
      console.log(`Copied ${frontendFramework} (${frontendLanguage}) template from ${frontendTemplateDir} to ${frontendDir}`);

      // Inject correct bridge/loader files if not present
      const frontendSrcDir = path.join(frontendDir, 'src');
      const frontendPublicDir = path.join(frontendDir, 'public');

      // Bridge: .ts for TypeScript, .js for JavaScript
      let bridgeSrc, bridgeDest;
      if (frontendLanguage === 'ts') {
        bridgeSrc = path.join(frontendTemplateDir, 'src', 'qwebchannel-bridge.ts');
        bridgeDest = path.join(frontendSrcDir, 'qwebchannel-bridge.ts');
        if (!fs.existsSync(bridgeDest) && fs.existsSync(bridgeSrc)) {
          copyFileSyncWithDirs(bridgeSrc, bridgeDest);
          console.log('Injected qwebchannel-bridge.ts into src/src.');
        }
      } else {
        bridgeSrc = path.join(TEMPLATE_DIR, 'frontend', 'shared', 'qwebchannel-bridge.js');
        bridgeDest = path.join(frontendSrcDir, 'qwebchannel-bridge.js');
        if (!fs.existsSync(bridgeDest)) {
          copyFileSyncWithDirs(bridgeSrc, bridgeDest);
          console.log('Injected qwebchannel-bridge.js into src/src.');
        }
      }

      // Loader: always .js (no .ts version exists)
      const loaderSrc = path.join(TEMPLATE_DIR, 'frontend', 'shared', 'qwebchannel-loader.js');
      const loaderDest = path.join(frontendPublicDir, 'qwebchannel-loader.js');
      if (!fs.existsSync(loaderDest)) {
        copyFileSyncWithDirs(loaderSrc, loaderDest);
        console.log('Injected qwebchannel-loader.js into src/public.');
      }

      // Patch vite.config.js for Svelte (not Vue/React)
      if (frontendFramework === 'svelte') {
        const viteConfigPath = path.join(frontendDir, 'vite.config.js');
        if (fs.existsSync(viteConfigPath)) {
          let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
          if (!viteConfig.includes('base:')) {
            viteConfig = viteConfig.replace(
              /defineConfig\(\s*{([\s\S]*?)plugins:/,
              "defineConfig({\n  base: './',\n  $1plugins:"
            );
            fs.writeFileSync(viteConfigPath, viteConfig, 'utf8');
            console.log("Patched vite.config.js to set base: './' for file-based loading.");
          }
        }
      }

      // Check for src/package.json existence
      const pkgJsonPath = path.join(frontendDir, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) {
        throw new Error('src/package.json was not created. Frontend scaffolding failed or incomplete.');
      }

      console.log(`Frontend scaffolding complete: src/ (${frontendFramework})`);
    } catch (err) {
      console.error('Frontend scaffolding failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('Frontend scaffolding skipped.');
  }

  // ---------------------------
  // 6. Scaffold Backend
  // ---------------------------
  if (scaffoldBackend) {
    try {
      const backendDir = path.join(projectRoot, 'src-taqyon');
      if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
      }

      // Prompt for backend features
      const { enableLogging, enableDevServer } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableLogging',
          message: 'Enable logging?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'enableDevServer',
          message: 'Enable dev server?',
          default: true,
        },
      ]);

      // Copy backend template files with placeholder replacement
      const backendTemplateDir = path.join(TEMPLATE_DIR, 'src-taqyon');
      const replacements = {
        projectName,
        projectVersion: '1.0.0',
        qt6Path: '/path/to/qt6', // Will be replaced after detection
        enableLogging: enableLogging ? '1' : '0',
        enableDevServer: enableDevServer ? '1' : '0',
      };
      copyDirRecursiveWithReplace(backendTemplateDir, backendDir, replacements);
      console.log('Copied backend template files to src-taqyon/ with placeholder replacement.');

      // Detect Qt6 and add configuration
      if (!detectedQt6Path) {
        console.log('\nWARNING: Qt6 was not detected automatically.');
        const { userQtPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'userQtPath',
            message: 'Enter Qt6 installation path (or press Enter to skip):',
          },
        ]);
        if (userQtPath) {
          const validPath = validateQtPath(userQtPath);
          if (validPath) {
            detectedQt6Path = validPath;
          } else {
            console.log('\nWARNING: The provided Qt6 path could not be validated.');
            console.log("The project will still be created, but you'll need to configure Qt manually.");
            console.log('See the README.md file for more information.\n');
          }
        }
      }
      if (detectedQt6Path) {
        qtModuleStatus = getQtModuleStatus(detectedQt6Path);
        if (qtModuleStatus.missing.length > 0) {
          console.log('\nWARNING: Qt6 is detected, but required modules are missing.');
          printQtInstallHints(qtModuleStatus.missing);
        }
      }

      // Create a helper script for building with the correct Qt path
      const isWindows = process.platform === 'win32';
      const buildScriptName = isWindows ? 'build.bat' : 'build.sh';
      const rcPath = path.join(projectRoot, '.taqyonrc');
      fs.writeFileSync(rcPath, JSON.stringify({ qt6Path: detectedQt6Path || null }, null, 2));

      let buildScriptContent;
      if (detectedQt6Path) {
        console.log(`\nQt6 found at: ${detectedQt6Path}`);
      } else {
        console.log('\nQt6 path not provided. Creating build script with instructions.');
      }
      buildScriptContent = isWindows
        ? `@echo off\nsetlocal\nset SCRIPT_DIR=%~dp0\nset RC_PATH=%SCRIPT_DIR%..\\.taqyonrc\nset QT_PATH=\nfor /f "delims=" %%p in ('node -e "const fs=require('fs');try{const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(c.qt6Path)process.stdout.write(c.qt6Path);}catch(e){}" "%RC_PATH%"') do set QT_PATH=%%p\nif "%QT_PATH%"=="" (\n  echo Qt6 was not detected during project creation.\n  echo Please specify the path to your Qt6 installation:\n  set /p QT_PATH=Qt6 path (e.g. C:\\\\Qt\\\\6.x.y\\\\msvc2019_64): \n)\nif "%QT_PATH%"=="" (\n  echo No Qt6 path provided.\n  echo You can manually run: cmake -B build -DCMAKE_PREFIX_PATH="path/to/qt6" ^&^& cmake --build build\n  exit /b 1\n)\necho Using Qt6 path: %QT_PATH%\nset BUILD_DIR=%SCRIPT_DIR%build\nif exist "%BUILD_DIR%\\CMakeCache.txt" (\n  for /f "tokens=2 delims==" %%a in ('findstr /b /c:"CMAKE_HOME_DIRECTORY:" "%BUILD_DIR%\\CMakeCache.txt"') do set CACHE_HOME=%%a\n  set SCRIPT_DIR_STRIP=%SCRIPT_DIR:~0,-1%\n  if not "%CACHE_HOME%"=="" if /i not "%CACHE_HOME%"=="%SCRIPT_DIR_STRIP%" (\n    echo CMake cache points to: %CACHE_HOME%\n    echo Current source dir:   %SCRIPT_DIR_STRIP%\n    set /p RESP=Delete build directory and reconfigure? (y/N): \n    if /i "%RESP%"=="y" (rmdir /s /q "%BUILD_DIR%") else exit /b 1\n  )\n)\ncmake -B "%BUILD_DIR%" -DCMAKE_PREFIX_PATH="%QT_PATH%" && cmake --build "%BUILD_DIR%"\n`
        : `#!/bin/bash\nset -e\n\nSCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"\nRC_PATH=\"$SCRIPT_DIR/../.taqyonrc\"\nQT_PATH=\"\"\n\nif [ -f \"$RC_PATH\" ]; then\n  QT_PATH=$(node -e \"const fs=require('fs');try{const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(c.qt6Path)process.stdout.write(c.qt6Path);}catch(e){}\" \"$RC_PATH\")\nfi\n\nif [ -z \"$QT_PATH\" ]; then\n  echo \"Qt6 was not detected during project creation.\"\n  echo \"Please specify the path to your Qt6 installation:\"\n  read -p \"Qt6 path (e.g. ~/Qt/6.10.1/macos): \" QT_PATH\nfi\n\nif [ -z \"$QT_PATH\" ]; then\n  echo \"No Qt6 path provided.\"\n  echo \"You can manually run: cmake -B build -DCMAKE_PREFIX_PATH=\\\"path/to/qt6\\\" && cmake --build build\"\n  exit 1\nfi\n\necho \"Using Qt6 path: $QT_PATH\"\n\nBUILD_DIR=\"$SCRIPT_DIR/build\"\nCACHE_FILE=\"$BUILD_DIR/CMakeCache.txt\"\nif [ -f \"$CACHE_FILE\" ]; then\n  CMAKE_HOME_DIR=$(grep '^CMAKE_HOME_DIRECTORY:' \"$CACHE_FILE\" | cut -d= -f2-)\n  if [ -n \"$CMAKE_HOME_DIR\" ] && [ \"$CMAKE_HOME_DIR\" != \"$SCRIPT_DIR\" ]; then\n    echo \"CMake cache points to: $CMAKE_HOME_DIR\"\n    echo \"Current source dir:   $SCRIPT_DIR\"\n    read -p \"Delete build directory and reconfigure? (y/N): \" RESP\n    if [[ \"$RESP\" =~ ^[Yy]$ ]]; then\n      rm -rf \"$BUILD_DIR\"\n    else\n      exit 1\n    fi\n  fi\nfi\n\ncmake -B \"$BUILD_DIR\" -DCMAKE_PREFIX_PATH=\"$QT_PATH\" && cmake --build \"$BUILD_DIR\"\n`;
      fs.writeFileSync(path.join(backendDir, buildScriptName), buildScriptContent);
      if (!isWindows) {
        fs.chmodSync(path.join(backendDir, buildScriptName), 0o755);
      }
      console.log(`Created build helper script: src-taqyon/${buildScriptName}`);

      // List all files in srcDir for confirmation
      const srcFiles = fs.readdirSync(backendDir);
      srcFiles.forEach((f) => console.log('  src-taqyon/' + f));
      console.log('Backend scaffolding complete.');
    } catch (err) {
      console.error('Backend scaffolding failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('Backend scaffolding skipped.');
  }

  // ---------------------------
  // 7. Create package.json
  // ---------------------------
  try {
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'Taqyon project with Qt/C++ backend and JS frontend',
      scripts: {},
      dependencies: {},
      devDependencies: {
        concurrently: '^8.0.0',
        'cross-env': '^7.0.0',
        'wait-on': '^7.0.0',
      },
    };
    const isWindows = process.platform === 'win32';

    if (scaffoldFrontend) {
      packageJson.scripts['frontend:dev'] = 'npm run --if-present --prefix src dev';
      packageJson.scripts['frontend:build'] = 'npm run --if-present --prefix src build';
    }
    if (scaffoldBackend) {
      if (isWindows) {
        packageJson.scripts['app:build'] = 'cd src-taqyon && .\\build.bat';
        packageJson.scripts['app:run'] = `if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe) else (echo Application executable not found. Make sure to build successfully first.)`;
        packageJson.scripts['app:run:verbose'] = `if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe --verbose) else (echo Application executable not found. Make sure to build successfully first.)`;
        packageJson.scripts['app:run:dev'] = `if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe --dev-server http://127.0.0.1:5173 --verbose) else (echo Application executable not found. Make sure to build successfully first.)`;
        packageJson.scripts['app:run:log'] = `if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe --log app.log --verbose) else (echo Application executable not found. Make sure to build successfully first.)`;
        packageJson.scripts['app:help'] = `if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe --help) else (echo Application executable not found. Make sure to build successfully first.)`;
      } else {
        packageJson.scripts['app:build'] = 'cd src-taqyon && chmod +x ./build.sh && ./build.sh';
        packageJson.scripts['app:run'] = `if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName}; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
        packageJson.scripts['app:run:verbose'] = `if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName} --verbose; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
        packageJson.scripts['app:run:dev'] = `if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName} --dev-server http://127.0.0.1:5173 --verbose; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
        packageJson.scripts['app:run:log'] = `if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName} --log app.log --verbose; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
        packageJson.scripts['app:help'] = `if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName} --help; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
      }
    }
    if (scaffoldFrontend && scaffoldBackend) {
      if (isWindows) {
        packageJson.scripts['start'] = `npm run build && set ABSOLUTE_PATH=%cd%\\src\\dist && if exist src-taqyon\\build\\bin\\${projectName}.exe (cd src-taqyon\\build\\bin && ${projectName}.exe --verbose --frontend-path "%ABSOLUTE_PATH%") else (echo Application executable not found. Make sure to build successfully first.)`;
        packageJson.scripts['build'] = 'npm run frontend:build && npm run app:build';
        packageJson.scripts['dev'] = 'node scripts/taqyon-dev.js';
      } else {
        packageJson.scripts['start'] = `npm run build && ABSOLUTE_PATH="$(pwd)/src/dist" && if [ -f src-taqyon/build/bin/${projectName} ]; then cd src-taqyon/build/bin && ./${projectName} --verbose --frontend-path "$ABSOLUTE_PATH"; else echo 'Application executable not found. Make sure to build successfully first.'; fi`;
        packageJson.scripts['build'] = 'npm run frontend:build && npm run app:build';
        packageJson.scripts['dev'] = 'node scripts/taqyon-dev.js';
      }
    } else if (scaffoldFrontend) {
      packageJson.scripts['start'] = 'npm run --if-present --prefix src';
      packageJson.scripts['build'] = 'npm run --if-present --prefix src build';
      packageJson.scripts['dev'] = 'npm run --if-present --prefix src dev';
    } else if (scaffoldBackend) {
      packageJson.scripts['start'] = 'npm run app:build && npm run app:run';
      packageJson.scripts['build'] = 'npm run app:build';
    }

    // Add Qt utility scripts
    packageJson.scripts['setup:qt'] =
      'node -e "const fs = require(\'fs\'); const path = process.argv[1]; if(path) { const config = JSON.parse(fs.readFileSync(\'.taqyonrc\', \'utf8\') || \'{}\'); config.qt6Path = path; fs.writeFileSync(\'.taqyonrc\', JSON.stringify(config, null, 2)); console.log(\'Qt6 path updated to \' + path); } else { console.error(\'Please provide a Qt6 path\'); }"';
    packageJson.scripts['test:qt'] =
      'node -e "const fs = require(\'fs\'); try { const config = JSON.parse(fs.readFileSync(\'.taqyonrc\', \'utf8\') || \'{}\'); if(config.qt6Path && fs.existsSync(config.qt6Path)) { console.log(\'Qt6 found at: \' + config.qt6Path); process.exit(0); } else { console.error(\'Qt6 not found at configured path: \' + (config.qt6Path || \'Not configured\')); process.exit(1); }} catch(e) { console.error(\'Error checking Qt6 installation:\', e.message); process.exit(1); }"';
    packageJson.scripts['verify:qt'] =
      "cd src-taqyon && mkdir -p build && cd build && cmake -L .. | grep -q 'WebEngineWidgets_FOUND:BOOL=TRUE' && echo 'Qt WebEngine is properly configured!' || echo 'ERROR: Qt WebEngine is not properly configured. Make sure Qt is installed with WebEngine support.'";

    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  } catch (err) {
    console.error('Failed to create package.json:', err.message);
    process.exit(1);
  }

  // ---------------------------
  // 7b. Create dev helper script
  // ---------------------------
  if (scaffoldFrontend && scaffoldBackend) {
    try {
      const scriptsDir = path.join(projectRoot, 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      const devScriptPath = path.join(scriptsDir, 'taqyon-dev.js');
      const devScriptContent = `#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'src');
const backendDir = path.join(projectRoot, 'src-taqyon');
const pkgPath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const appName = pkg.name;

const basePort = 5173;
const maxPort = 5273;
const maxAttempts = 5;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function randomPort() {
  return Math.floor(Math.random() * (maxPort - basePort + 1)) + basePort;
}

async function pickPort() {
  for (let i = 0; i < maxAttempts; i += 1) {
    const port = randomPort();
    if (await isPortFree(port)) return port;
  }
  return basePort;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(\`\${cmd} exited with code \${code}\`));
    });
  });
}

async function waitForPort(port) {
  const waitOn = require('wait-on');
  await waitOn({ resources: [\`tcp:127.0.0.1:\${port}\`], timeout: 60000 });
}

function getBinaryPath() {
  if (process.platform === 'win32') {
    return path.join(backendDir, 'build', 'bin', \`\${appName}.exe\`);
  }
  return path.join(backendDir, 'build', 'bin', appName);
}

async function main() {
  if (!fs.existsSync(frontendDir)) {
    console.error('Frontend directory not found at:', frontendDir);
    process.exit(1);
  }
  if (!fs.existsSync(backendDir)) {
    console.error('Backend directory not found at:', backendDir);
    process.exit(1);
  }

  const port = await pickPort();
  const devUrl = \`http://localhost:\${port}\`;
  console.log(\`Using dev server: \${devUrl}\`);

  const frontendArgs = ['run', '--prefix', frontendDir, 'dev', '--', '--port', String(port), '--strictPort'];
  const frontend = spawn('npm', frontendArgs, { stdio: 'inherit', shell: process.platform === 'win32' });

  frontend.on('exit', (code) => {
    if (code && code !== 0) {
      console.error('Frontend dev server exited with code', code);
      process.exit(code);
    }
  });

  await waitForPort(port);
  await run('npm', ['run', 'app:build'], { cwd: projectRoot });

  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) {
    console.error('Application executable not found. Make sure to build successfully first.');
    process.exit(1);
  }

  const backend = spawn(binPath, ['--dev-server', devUrl, '--verbose'], { stdio: 'inherit' });
  backend.on('exit', (code) => {
    frontend.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
`;
      fs.writeFileSync(devScriptPath, devScriptContent);
      fs.chmodSync(devScriptPath, 0o755);
    } catch (err) {
      console.error('Failed to create dev helper script:', err.message);
      process.exit(1);
    }
  }

  // ---------------------------
  // 8. Create README.md
  // ---------------------------
  try {
    let readmeContent = `# ${projectName}\n\nA desktop application created with Taqyon.\n\n`;
    if (scaffoldFrontend) {
      readmeContent += `## Frontend\n\nThe frontend is located in the \`src/\` directory and uses ${frontendFramework}.\n\n`;
    }
    if (scaffoldBackend) {
      readmeContent += `## Backend\n\nThe backend is located in the \`src-taqyon/\` directory and uses Qt.\n\n`;
      // Get qt6Path from the .taqyonrc file if it exists
      let backendQt6Path = null;
      const rcPath = path.join(projectRoot, '.taqyonrc');
      if (fs.existsSync(rcPath)) {
        try {
          const rcContent = fs.readFileSync(rcPath, 'utf8');
          const rcData = JSON.parse(rcContent);
          backendQt6Path = rcData.qt6Path;
        } catch (err) {
          console.error('Warning: Failed to read .taqyonrc file:', err.message);
        }
      }
      if (backendQt6Path) {
        readmeContent += `Qt6 path: \`${backendQt6Path}\`\n\n`;
      } else {
        readmeContent += `### Qt Not Detected\n\n`;
        readmeContent += `Qt6 was not found during project creation. You have several options:\n\n`;
        readmeContent += `1. **Install Qt6**: Download and install from [qt.io](https://www.qt.io/download-qt-installer)\n`;
        readmeContent += `2. **Specify path manually**: When running \`npm run app:build\`, you will be prompted for the Qt6 path\n`;
        readmeContent += `3. **Edit .taqyonrc**: Update the \`qt6Path\` value in this file with your Qt6 installation path\n\n`;
        readmeContent += `Common Qt6 installation paths:\n`;
        readmeContent += `- macOS: \`~/Qt/6.x.y/macos\` or \`/usr/local/opt/qt6\` (Homebrew)\n`;
        readmeContent += `- Windows: \`C:\\\\Qt\\\\6.x.y\\\\msvc2019_64\`\n`;
        readmeContent += `- Linux: \`~/Qt/6.x.y/gcc_64\` or \`/usr/lib/qt6\`\n\n`;
      }
    }
    readmeContent += `## Development\n\n`;
    readmeContent += `- \`npm start\`: Run the development environment\n`;
    readmeContent += `- \`npm run build\`: Build the project\n`;
    if (scaffoldFrontend) {
      readmeContent += `- \`npm run frontend:dev\`: Run frontend development server\n`;
      readmeContent += `- \`npm run frontend:build\`: Build frontend\n`;
    }
    if (scaffoldBackend) {
      readmeContent += `- \`npm run app:build\`: Build backend\n`;
      readmeContent += `- \`npm run app:run\`: Run backend\n`;
    }
    fs.writeFileSync(path.join(projectRoot, 'README.md'), readmeContent);
  } catch (err) {
    console.error('Failed to create README.md:', err.message);
    process.exit(1);
  }

  // ---------------------------
  // 9. Final Output
  // ---------------------------
  console.log('\nProject scaffolded successfully!');
  console.log(`Navigate to your project with: cd ${projectName}`);
  console.log("Run 'npm install' to install dependencies if needed");

  if (scaffoldBackend && !detectedQt6Path) {
    console.log('\nIMPORTANT: Qt6 was not detected during scaffolding!');
    console.log('You have three options to resolve this:');
    console.log('1. Install Qt6 from https://www.qt.io/download-qt-installer');
    console.log("2. When running 'npm run app:build', you'll be prompted for the Qt6 path");
    console.log("3. Edit .taqyonrc and set the 'qt6Path' value to your Qt6 installation directory");
  }

  console.log("\nRun 'npm start' to start development");
  console.log('Done.');
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { createApp };
