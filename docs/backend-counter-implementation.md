# Backend Counter Implementation (C++)

This document details how the C++ `BackendObject` class is implemented to support the shared counter example, enabling interaction with a JavaScript frontend via QWebChannel.

Refer to `templates/src-taqyon/backend/backendobject.h` and `templates/src-taqyon/backend/backendobject.cpp` for the source code.

## Core Components of `BackendObject`

### 1. Header File (`backendobject.h`)

```cpp
#pragma once

#include <QObject>

class BackendObject : public QObject {
    Q_OBJECT // Essential for Qt\'s meta-object system (signals, slots, properties)

    // Properties exposed to QML/JavaScript
    Q_PROPERTY(QString message READ message WRITE setMessage NOTIFY messageChanged)
    Q_PROPERTY(int count READ count WRITE setCount NOTIFY countChanged)

public:
    explicit BackendObject(QObject *parent = nullptr);

    // Getter for \'message\' property
    QString message() const;
    // Setter for \'message\' property
    void setMessage(const QString &msg);

    // Getter for \'count\' property
    int count() const;
    // Setter for \'count\' property
    void setCount(int count);

public slots:
    // Method callable from JavaScript to send text to the backend
    void sendToBackend(const QString &text);
    // Method callable from JavaScript to increment the counter
    void incrementCount();

signals:
    // Signal emitted when the \'message\' property changes
    void messageChanged(const QString &msg);
    // Signal to send arbitrary text from backend to frontend
    void sendToFrontend(const QString &text);
    // Signal emitted when the \'count\' property changes
    void countChanged(int count);

private:
    QString m_message; // Private member variable for message
    int m_count;     // Private member variable for count
};
```

**Key Elements in `backendobject.h`:**

*   **`#include <QObject>`**: Inherits from `QObject` to leverage Qt\'s meta-object system.
*   **`Q_OBJECT` Macro**: This macro is mandatory for any class that defines signals, slots, or Qt properties. It enables features like introspection and communication.
*   **`Q_PROPERTY(...)`**: This macro declares properties that can be accessed from JavaScript (and QML).
    *   `QString message READ message WRITE setMessage NOTIFY messageChanged`: Defines a property named `message` of type `QString`.
        *   `READ message`: Specifies `message()` as the getter method.
        *   `WRITE setMessage`: Specifies `setMessage()` as the setter method.
        *   `NOTIFY messageChanged`: Specifies `messageChanged(QString)` as the signal emitted when the property value changes.
    *   `int count READ count WRITE setCount NOTIFY countChanged`: Defines a property named `count` of type `int` with its corresponding getter, setter, and notification signal.
*   **Public Methods (Getters/Setters)**:
    *   `QString message() const;` and `void setMessage(const QString &msg);`
    *   `int count() const;` and `void setCount(int count);`
*   **`public slots:`**: Declares methods that can be invoked from the frontend (via QWebChannel) or connected to signals from other QObjects.
    *   `void sendToBackend(const QString &text);`: An example slot that JavaScript can call.
    *   `void incrementCount();`: The slot called by the frontend to increment the counter.
*   **`signals:`**: Declares signals that the object can emit to notify other objects (including the JavaScript frontend) of events or state changes.
    *   `void messageChanged(const QString &msg);`: Emitted by `setMessage` when the message changes.
    *   `void sendToFrontend(const QString &text);`: An example signal to send data to JavaScript.
    *   `void countChanged(int count);`: Emitted by `setCount` when the count changes. This is crucial for the frontend to react to counter updates.
*   **Private Members**: `m_message` and `m_count` store the actual data for the properties.

### 2. Source File (`backendobject.cpp`)

```cpp
#include "backendobject.h"
#include <QDebug> // For logging (qInfo, qDebug, etc.)

// Constructor: Initializes member variables
BackendObject::BackendObject(QObject *parent)
    : QObject(parent), m_message("Hello from C++ backend!"), m_count(0) {}

// Getter for \'message\' property
QString BackendObject::message() const {
    return m_message;
}

// Setter for \'message\' property
void BackendObject::setMessage(const QString &msg) {
    if (m_message != msg) { // Only proceed if the value actually changes
        m_message = msg;
        emit messageChanged(m_message); // Emit signal to notify listeners
    }
}

// Getter for \'count\' property
int BackendObject::count() const {
    return m_count;
}

// Setter for \'count\' property
void BackendObject::setCount(int newCountValue) { // Renamed parameter for clarity
    // Log the count value when called, e.g., from frontend
    qInfo() << "Backend received setCount with value:" << newCountValue;

    if (m_count != newCountValue) { // Only proceed if the value actually changes
        m_count = newCountValue;
        emit countChanged(m_count); // Emit signal with the new count
    }
}

// Slot implementation for incrementing the count
void BackendObject::incrementCount() {
    qInfo() << "Backend incrementCount called, current count before increment:" << m_count;
    setCount(m_count + 1); // Calls the setCount setter, which handles emitting the signal
}

// Slot implementation for handling messages from frontend
void BackendObject::sendToBackend(const QString &text) {
    qInfo() << "Backend received from frontend via sendToBackend slot:" << text;
    // Example: echo back to frontend by emitting another signal
    emit sendToFrontend(QString("Backend received: %1 - Thanks!").arg(text));
}
```

**Key Elements in `backendobject.cpp`:**

*   **Constructor**: Initializes `m_message` to "Hello from C++ backend!" and `m_count` to 0.
*   **Getter Implementations**: `message()` and `count()` simply return the values of their respective private member variables.
*   **Setter Implementations (`setMessage`, `setCount`)**:
    *   They first check if the new value is different from the current value. This prevents unnecessary signal emissions and potential infinite loops if a signal handler also modifies the property.
    *   If the value changes, the private member is updated.
    *   Crucially, `emit propertyChangedSignal(newValue);` is called. This is how Qt\'s property system notifies listeners (including the QWebChannel and thus the JavaScript frontend) that the property has been updated.
*   **`incrementCount()` Slot**: This method is called by the frontend. It increments `m_count` by calling `setCount(m_count + 1)`. Using the `setCount` setter ensures that the `countChanged` signal is emitted correctly, automatically updating any connected JavaScript listeners.
*   **`sendToBackend()` Slot**: This is an example of how the backend can receive data from the frontend. In this implementation, it logs the received text and then emits the `sendToFrontend` signal, effectively echoing a modified message back.
*   **`QDebug` / `qInfo()`**: Used for logging messages to the console, which is helpful for debugging interactions.

## How it Works Together (Counter Example)

1.  **Initialization**: When the C++ application starts, `BackendObject` is created and exposed to the QWebChannel under the name "backend". The frontend\'s `setupQtConnection()` connects to this object.
2.  **Frontend Reads Initial Count**: The frontend JavaScript reads `backend.count` (which calls `BackendObject::count()`) to display the initial value (0).
3.  **Frontend Connects to `countChanged` Signal**: The frontend JavaScript connects a function to `backend.countChanged`. This function will update the count displayed in the UI.
4.  **User Clicks Increment Button (Frontend)**:
    *   The JavaScript click handler calls `backend.incrementCount()`.
5.  **Backend `incrementCount()` Slot Executed**:
    *   `BackendObject::incrementCount()` in C++ is invoked.
    *   This slot calls `setCount(m_count + 1)`.
6.  **Backend `setCount()` Setter Executed**:
    *   `BackendObject::setCount()` updates `m_count`.
    *   Since `m_count` changed, it emits the `countChanged(new_value)` signal.
7.  **Frontend Receives `countChanged` Signal**:
    *   The JavaScript function connected in step 3 is executed with the new count.
    *   This function updates the UI (e.g., React state, Vue ref, Svelte variable) to display the new count.

This clear separation of concerns and the signal/slot mechanism allow for robust and decoupled communication between the C++ backend and the JavaScript frontend. 
