#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RC_PATH="$SCRIPT_DIR/../.taqyonrc"
QT_PATH=""

if [ -f "$RC_PATH" ]; then
  QT_PATH=$(node -e "const fs=require('fs');try{const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(c.qt6Path)process.stdout.write(c.qt6Path);}catch(e){}" "$RC_PATH")
fi

if [ -z "$QT_PATH" ]; then
  echo "Qt6 was not detected during project creation."
  echo "Please specify the path to your Qt6 installation:"
  read -p "Qt6 path (e.g. ~/Qt/6.10.1/macos): " QT_PATH
fi

if [ -z "$QT_PATH" ]; then
  echo "No Qt6 path provided."
  echo "You can manually run: cmake -B build -DCMAKE_PREFIX_PATH=\"path/to/qt6\" && cmake --build build"
  exit 1
fi

echo "Using Qt6 path: $QT_PATH"

BUILD_DIR="$SCRIPT_DIR/build"
CACHE_FILE="$BUILD_DIR/CMakeCache.txt"
if [ -f "$CACHE_FILE" ]; then
  CMAKE_HOME_DIR=$(grep '^CMAKE_HOME_DIRECTORY:' "$CACHE_FILE" | cut -d= -f2-)
  if [ -n "$CMAKE_HOME_DIR" ] && [ "$CMAKE_HOME_DIR" != "$SCRIPT_DIR" ]; then
    echo "CMake cache points to: $CMAKE_HOME_DIR"
    echo "Current source dir:   $SCRIPT_DIR"
    read -p "Delete build directory and reconfigure? (y/N): " RESP
    if [[ "$RESP" =~ ^[Yy]$ ]]; then
      rm -rf "$BUILD_DIR"
    else
      exit 1
    fi
  fi
fi

cmake -B "$BUILD_DIR" -DCMAKE_PREFIX_PATH="$QT_PATH" && cmake --build "$BUILD_DIR"
