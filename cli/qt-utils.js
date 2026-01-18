// qt-utils.js
// Utilities for detecting and validating Qt6 installations (cross-platform, no CLI interaction).

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

/** Supported Qt6 versions (descending order, most recent first) */
const QT_VERSIONS = [
  '6.10.1', '6.10.0',
  '6.9.0', '6.8.0', '6.7.0', '6.6.0', '6.5.0', '6.4.0', '6.3.0', '6.2.0'
];

/** Environment variables that may point to a Qt installation */
const QT_ENV_VARS = ['QTDIR', 'QT_DIR', 'Qt6_DIR'];

/** Common subdirectories to try if the main path is not valid */
const QT_SUBDIRS = [
  'macos', 'clang_64', 'gcc_64', 'msvc2019_64', 'lib', 'Qt6'
];

/** Qt modules required by the backend template */
const QT_REQUIRED_MODULES = [
  'Core',
  'Gui',
  'Widgets',
  'Positioning',
  'WebEngineCore',
  'WebEngineWidgets',
  'WebChannel'
];

/* ============================================================================
 * HELPERS: Platform Detection
 * ========================================================================== */

/**
 * Returns an object with platform booleans.
 * @returns {{isWindows: boolean, isMacOS: boolean, isLinux: boolean}}
 */
function getPlatform() {
  const platform = process.platform;
  return {
    isWindows: platform === 'win32',
    isMacOS: platform === 'darwin',
    isLinux: platform === 'linux'
  };
}

/* ============================================================================
 * CORE: Qt Directory Validation
 * ========================================================================== */

/**
 * Checks if a directory is a valid Qt6 installation root.
 * Does not throw; returns a boolean.
 * @param {string} dir - Path to check.
 * @returns {boolean} True if valid Qt6 root, false otherwise.
 */
function isValidQtDir(dir) {
  if (!dir || typeof dir !== 'string' || !fs.existsSync(dir)) {
    return false;
  }
  const { isWindows, isMacOS, isLinux } = getPlatform();

  // Check for key Qt directories
  const markers = [
    path.join(dir, 'lib'),
    path.join(dir, 'include'),
    path.join(dir, 'bin')
  ];
  const hasMarkers = markers.some(marker => fs.existsSync(marker));
  if (!hasMarkers) return false;

  // Platform-specific library checks
  let hasLibs = false;
  try {
    if (isWindows) {
      hasLibs = fs.existsSync(path.join(dir, 'lib', 'Qt6Core.lib'));
    } else if (isMacOS) {
      const macOSLibs = [
        path.join(dir, 'lib', 'QtCore.framework'),
        path.join(dir, 'lib', 'libQt6Core.dylib'),
        path.join(dir, 'lib', 'libQt6Core.a')
      ];
      hasLibs = macOSLibs.some(lib => fs.existsSync(lib));
      if (!hasLibs && fs.existsSync(path.join(dir, 'lib'))) {
        const libItems = fs.readdirSync(path.join(dir, 'lib'));
        hasLibs = libItems.some(item =>
          item === 'QtCore.framework' ||
          (item.includes('Qt6Core') && (item.endsWith('.dylib') || item.endsWith('.a')))
        );
      }
    } else if (isLinux) {
      hasLibs = fs.existsSync(path.join(dir, 'lib', 'libQt6Core.so'));
    }
  } catch (_) {
    // Ignore errors, treat as not found
    hasLibs = false;
  }

  // Include checks
  let hasIncludes = false;
  const includeLocations = [
    path.join(dir, 'include', 'QtCore'),
    path.join(dir, 'include', 'QtCore', 'QObject'),
    path.join(dir, 'include', 'Qt6', 'QtCore', 'QObject')
  ];
  hasIncludes = includeLocations.some(loc => fs.existsSync(loc));
  if (!hasIncludes && isMacOS) {
    const frameworkInclude = path.join(dir, 'lib', 'QtCore.framework', 'Headers');
    hasIncludes = fs.existsSync(frameworkInclude);
    if (!hasIncludes && fs.existsSync(path.join(dir, 'include'))) {
      try {
        const includeItems = fs.readdirSync(path.join(dir, 'include'));
        hasIncludes = includeItems.some(item => item.startsWith('Qt'));
      } catch (_) {
        hasIncludes = false;
      }
    }
  }

  return hasMarkers && (hasLibs || hasIncludes);
}

/* ============================================================================
 * PUBLIC: Qt Detection
 * ========================================================================== */

/**
 * Attempts to auto-detect a valid Qt6 installation directory.
 * @returns {string|null} Path to Qt6 root if found, or null if not found.
 */
function detectQt6() {
  const { isWindows, isMacOS, isLinux } = getPlatform();

  // 1. Try qmake in PATH
  try {
    const whichCmd = isWindows ? 'where' : 'which';
    const qmakeCommands = ['qmake6', 'qmake'];
    for (const qmakeCmd of qmakeCommands) {
      const result = spawnSync(whichCmd, [qmakeCmd], { stdio: 'pipe' });
      if (result.status === 0 && result.stdout) {
        const qmakePath = result.stdout.toString().trim().split('\n')[0];
        const cleanPath = qmakePath.replace(/["']/g, '');
        if (cleanPath && fs.existsSync(cleanPath)) {
          const qtDir = path.dirname(path.dirname(cleanPath));
          if (isValidQtDir(qtDir)) return qtDir;
        }
      }
    }
  } catch (_) {}

  // 2. Try qtpaths in PATH
  try {
    const qtpathsCommands = ['qtpaths6', 'qtpaths'];
    for (const qtpathsCmd of qtpathsCommands) {
      const result = spawnSync(isWindows ? 'where' : 'which', [qtpathsCmd], { stdio: 'pipe' });
      if (result.status === 0 && result.stdout) {
        const qtpathsPath = result.stdout.toString().trim().split('\n')[0];
        const cleanPath = qtpathsPath.replace(/["']/g, '');
        if (cleanPath && fs.existsSync(cleanPath)) {
          const prefixResult = spawnSync(cleanPath, ['--query=QT_INSTALL_PREFIX'], { stdio: 'pipe' });
          if (prefixResult.status === 0 && prefixResult.stdout) {
            const qtDir = prefixResult.stdout.toString().trim();
            if (qtDir && isValidQtDir(qtDir)) return qtDir;
          }
        }
      }
    }
  } catch (_) {}

  // 3. Check environment variables
  for (const varName of QT_ENV_VARS) {
    const qtDir = process.env[varName];
    if (qtDir && isValidQtDir(qtDir)) return qtDir;
  }

  // 4. Platform-specific candidate locations
  let candidates = [];
  if (isWindows) {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    for (const version of QT_VERSIONS) {
      candidates.push(path.join('C:\\Qt', version, 'msvc2019_64'));
      candidates.push(path.join('C:\\Qt', version, 'msvc2019'));
      candidates.push(path.join('C:\\Qt', version, 'mingw_64'));
      candidates.push(path.join('C:\\Qt', version, 'mingw81_64'));
      candidates.push(path.join('C:\\Qt', version, 'mingw81_32'));
      candidates.push(path.join(programFiles, 'Qt', version, 'msvc2019_64'));
      candidates.push(path.join(programFiles, 'Qt', version, 'mingw_64'));
      candidates.push(path.join(programFilesX86, 'Qt', version, 'msvc2019'));
      candidates.push(path.join(programFilesX86, 'Qt', version, 'mingw_32'));
    }
    candidates.push(path.join('C:\\Qt\\6'));
    candidates.push(path.join(programFiles, 'Qt\\6'));
    candidates.push(path.join(programFilesX86, 'Qt\\6'));
    candidates.push('C:\\msys64\\mingw64\\qt6');
    candidates.push('C:\\msys64\\mingw32\\qt6');
  } else if (isMacOS) {
    for (const version of QT_VERSIONS) {
      candidates.push(path.join(os.homedir(), 'Qt', version, 'macos'));
      candidates.push(path.join(os.homedir(), 'Qt', version, 'clang_64'));
      candidates.push(path.join(os.homedir(), 'Qt', version, 'ios'));
      candidates.push(path.join(os.homedir(), 'Qt', version, 'macx_clang_64'));
    }
    candidates.push('/usr/local/opt/qt6');
    candidates.push('/usr/local/opt/qt@6');
    candidates.push('/usr/local/opt/qt');
    candidates.push('/opt/homebrew/opt/qt6');
    candidates.push('/opt/homebrew/opt/qt@6');
    candidates.push('/opt/homebrew/opt/qt');
    candidates.push('/opt/local/libexec/qt6');
    candidates.push('/opt/local/lib/qt6');
    candidates.push('/Library/Frameworks/Qt6');
    candidates.push('/Applications/Qt6');
  } else if (isLinux) {
    for (const version of QT_VERSIONS) {
      candidates.push(path.join(os.homedir(), 'Qt', version, 'gcc_64'));
      candidates.push(path.join(os.homedir(), 'Qt', version));
    }
    candidates.push('/usr/lib/qt6');
    candidates.push('/usr/lib/x86_64-linux-gnu/qt6');
    candidates.push('/usr/share/qt6');
    candidates.push('/usr/local/lib/qt6');
    candidates.push('/usr/local/qt6');
    candidates.push('/usr/lib64/qt6');
    candidates.push('/usr/lib/qt');
    candidates.push('/opt/qt6');
    candidates.push('/opt/Qt6');
    candidates.push('/app/lib/qt6');
    candidates.push('/app/lib/x86_64-linux-gnu/qt6');
  }
  const commonLocations = [
    '/usr/local/Qt-6',
    '/usr/local/Qt6',
    '/usr/local/qt6',
    '/opt/Qt6'
  ];
  candidates = [...candidates, ...commonLocations];
  for (const dir of candidates) {
    if (isValidQtDir(dir)) return dir;
  }

  // 5. Last resort: search using system commands (best effort, may be slow)
  try {
    let searchLocations = [];
    let searchCommand = null;
    let searchArgs = [];
    if (isWindows) {
      searchLocations = [
        'C:\\Qt',
        'C:\\Program Files\\Qt',
        'C:\\Program Files (x86)\\Qt'
      ];
      searchCommand = 'powershell';
      searchArgs = ['-Command', 'Get-ChildItem -Path "$SEARCH_PATH" -Filter "Qt6Core.*" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 DirectoryName'];
    } else {
      searchLocations = [
        '/usr',
        '/usr/local',
        '/opt',
        os.homedir()
      ];
      searchCommand = 'find';
      searchArgs = ['$SEARCH_PATH', '-name', 'libQt6Core.*', '-o', '-name', 'Qt6Core.framework', '-type', 'd', '-o', '-type', 'f', '2>/dev/null', '|', 'head', '-n', '1'];
    }
    for (const searchPath of searchLocations) {
      if (!fs.existsSync(searchPath)) continue;
      const args = searchArgs.map(arg => arg.replace('$SEARCH_PATH', searchPath));
      const result = spawnSync(searchCommand, args, {
        stdio: 'pipe',
        shell: true
      });
      if (result.status === 0 && result.stdout && result.stdout.toString().trim()) {
        const foundPath = result.stdout.toString().trim();
        let qtDir;
        if (foundPath.includes('lib')) {
          qtDir = foundPath.split('lib')[0].trim();
        } else if (foundPath.includes('include')) {
          qtDir = foundPath.split('include')[0].trim();
        } else if (isWindows) {
          qtDir = path.dirname(path.dirname(foundPath));
        }
        if (qtDir && isValidQtDir(qtDir)) return qtDir;
      }
    }
  } catch (_) {}

  // Not found
  return null;
}

/* ============================================================================
 * PUBLIC: Qt Path Validation (User-provided)
 * ========================================================================== */

/**
 * Validates a user-provided Qt6 installation path.
 * Tries the path and common subdirectories.
 * @param {string} qtPath - Path to validate.
 * @returns {string|null} Valid Qt6 root path, or null if not valid.
 */
function validateQtPath(qtPath) {
  if (!qtPath || typeof qtPath !== 'string') return null;

  const tryUpwards = (startPath) => {
    let current = startPath;
    for (let i = 0; i < 6; i++) {
      if (isValidQtDir(current)) return current;
      const parent = path.dirname(current);
      if (!parent || parent === current) break;
      current = parent;
    }
    return null;
  };

  const resolved = path.resolve(qtPath);

  // Accept paths that point at a qmake/qtpaths binary or at subdirs like .../lib.
  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const fromFile = tryUpwards(path.dirname(resolved));
      if (fromFile) return fromFile;
    }
  } catch (_) {}

  const direct = tryUpwards(resolved);
  if (direct) return direct;

  // Try common subdirectories (and then walk upwards from them too).
  for (const subdir of QT_SUBDIRS) {
    const fullPath = path.join(resolved, subdir);
    const found = tryUpwards(fullPath);
    if (found) return found;
  }

  return null;
}

/* ============================================================================
 * PUBLIC: Qt Module Checks
 * ========================================================================== */

/**
 * Best-effort check for a Qt module within a Qt6 installation.
 * @param {string} qtDir - Qt6 root directory.
 * @param {string} moduleName - Qt module name (e.g., "WebEngineCore").
 * @returns {boolean} True if the module is likely present.
 */
function hasQtModule(qtDir, moduleName) {
  if (!qtDir || !moduleName) return false;
  const libDir = path.join(qtDir, 'lib');
  const cmakeDir = path.join(libDir, 'cmake', `Qt6${moduleName}`);
  const frameworkPath = path.join(libDir, `Qt${moduleName}.framework`);
  const windowsLib = path.join(libDir, `Qt6${moduleName}.lib`);
  const macDylib = path.join(libDir, `libQt6${moduleName}.dylib`);
  const staticLib = path.join(libDir, `libQt6${moduleName}.a`);

  if (fs.existsSync(cmakeDir)) return true;
  if (fs.existsSync(frameworkPath)) return true;
  if (fs.existsSync(windowsLib)) return true;
  if (fs.existsSync(macDylib)) return true;
  if (fs.existsSync(staticLib)) return true;

  try {
    if (fs.existsSync(libDir)) {
      const entries = fs.readdirSync(libDir);
      const soPrefix = `libQt6${moduleName}.so`;
      const dylibPrefix = `libQt6${moduleName}.dylib`;
      const libPrefix = `Qt6${moduleName}.lib`;
      return entries.some((entry) =>
        entry.startsWith(soPrefix) ||
        entry.startsWith(dylibPrefix) ||
        entry.startsWith(libPrefix)
      );
    }
  } catch (_) {
    return false;
  }

  return false;
}

/**
 * Checks a Qt6 installation for required modules.
 * @param {string} qtDir - Qt6 root directory.
 * @param {string[]} [modules] - Module list to verify.
 * @returns {{found: Record<string, boolean>, missing: string[]}}
 */
function getQtModuleStatus(qtDir, modules = QT_REQUIRED_MODULES) {
  const found = {};
  const missing = [];
  for (const moduleName of modules) {
    const ok = hasQtModule(qtDir, moduleName);
    found[moduleName] = ok;
    if (!ok) missing.push(moduleName);
  }
  return { found, missing };
}

/* ============================================================================
 * EXPORTS
 * ========================================================================== */

export {
    detectQt6, isValidQtDir, QT_ENV_VARS,
    QT_SUBDIRS, QT_VERSIONS, validateQtPath,
    QT_REQUIRED_MODULES, getQtModuleStatus
};
