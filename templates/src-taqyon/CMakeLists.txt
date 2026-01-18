cmake_minimum_required(VERSION 3.16)
project({{projectName}} LANGUAGES CXX)

set(CMAKE_AUTOMOC ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set Qt6 installation path if provided
if(DEFINED ENV{QT6_DIR})
    set(CMAKE_PREFIX_PATH $ENV{QT6_DIR})
    message(STATUS "Using Qt6 path from environment: $ENV{QT6_DIR}")
elif(DEFINED QT6_DIR)
    set(CMAKE_PREFIX_PATH ${QT6_DIR})
    message(STATUS "Using Qt6 path from command line: ${QT6_DIR}")
endif()

# Find Qt6 core components
find_package(Qt6 COMPONENTS Core Gui Widgets REQUIRED)

# Try to find Positioning module first (dependency of WebEngine)
find_package(Qt6 COMPONENTS Positioning)
if(NOT Qt6Positioning_FOUND)
    message(FATAL_ERROR "\nQt6Positioning module not found, which is required for Qt WebEngine.\n\nPlease install Qt6 with Positioning support.\n")
endif()

# Find WebEngine components - they are required
find_package(Qt6 COMPONENTS WebEngineCore WebEngineWidgets WebChannel REQUIRED)

# If we get here, all required components are found
message(STATUS "All required Qt6 components found, including WebEngine")

# Create the executable
add_executable({{projectName}}
    app/main.cpp
    backend/backendobject.cpp
    backend/backendobject.h
    app/mywebview.cpp
    app/mywebview.h
    app/mywebpage.cpp
    app/mywebpage.h
    app/mainwindow.cpp
    app/mainwindow.h
    app/app_setup.cpp
    app/app_setup.h
)


target_link_libraries({{projectName}} PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::WebEngineWidgets
    Qt6::WebChannel
)

# Set output directory based on build type
set_target_properties({{projectName}} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
) 