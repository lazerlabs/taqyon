# Frontend-Backend Communication with QWebChannel

This document explains how the JavaScript/TypeScript frontend communicates with the Qt/C++ backend in a Taqyon application, using the example of a shared counter.

## Core Concept: QWebChannel

Communication is facilitated by Qt\'s `QWebChannel` and the Qt WebEngine view that hosts your frontend (Chromium-based). The `qwebchannel-bridge.js` file in your frontend\'s `src` directory provides a helper function, `setupQtConnection()`, to simplify establishing this connection.

**Key Steps in `qwebchannel-bridge.js`:**
1.  **Loads `qwebchannel.js`**: This is Qt\'s client-side library for QWebChannel, typically loaded into the `public` directory of your frontend.
2.  **Initializes `QWebChannel`**: Waits for the `qt.webChannelTransport` object to be available (injected by the C++ backend into the web view).
3.  **Connects to Backend Object**: Once the transport is ready, it connects to a published C++ object (by default, named `backend`).
4.  **Returns a Promise**: The `setupQtConnection()` function returns a Promise that resolves with the `backend` object, giving you access to its properties, signals, and slots (methods).

## General Principles

Once `setupQtConnection()` resolves and you have the `backend` object in your frontend framework:

1.  **Accessing Properties**: Read properties directly from the `backend` object (e.g., `backend.count`, `backend.message`).
    *   Note: To make these properties reactive in your frontend UI, you\'ll need to map them to your framework\'s state management (e.g., React state, Vue refs, Svelte reactive variables). The backend object itself isn\'t inherently "reactive" in the frontend sense.
2.  **Calling Backend Slots (Methods)**: Call backend methods directly (e.g., `backend.incrementCount()`, `backend.sendToBackend(\'Hello!\')`). These calls are typically asynchronous.
3.  **Connecting to Backend Signals**: Backend signals can be connected to JavaScript functions. When the backend emits a signal, the connected function is called with the signal\'s arguments.
    *   Example: `backend.countChanged.connect(function(newCount) { /* update UI */ });`
    *   It\'s crucial to manage these connections, especially in component-based frameworks, to avoid memory leaks (e.g., disconnect when a component unmounts if the signal connection is made within the component). However, for signals tied to the lifetime of the main application backend object, this is less of an issue if connected once globally or in the main app component.

## Counter Example: Frontend Implementation

The counter example demonstrates a `count` property and an `incrementCount()` method on the backend. The frontend displays this count and has a button to increment it.

### 1. React (`src/App.jsx`)

```javascript
import { useState, useEffect } from \'react\';
import { setupQtConnection } from \'./qwebchannel-bridge.js\';
// Other imports...

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState(\'\');
  const [backend, setBackend] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(\'Initializing...\');

  useEffect(() => {
    console.log(\'Component mounted, setting up Qt connection\');
    setConnectionStatus(\'Connecting to Qt backend...\');

    setupQtConnection()
      .then(backendObj => {
        setBackend(backendObj);
        setConnectionStatus(\'Connected to backend ✓\');
        console.log(\'✅ Successfully connected to backend\');

        // Get initial values
        setCount(backendObj.count !== undefined ? backendObj.count : 0);
        setMessage(backendObj.message !== undefined ? backendObj.message : \'\');

        // Connect to signals
        if (backendObj.countChanged && typeof backendObj.countChanged.connect === \'function\') {
          backendObj.countChanged.connect(newCount => {
            console.log(\'💬 React Signal: countChanged received with value:\', newCount);
            setCount(newCount); // Update React state
          });
        }
        // ... connect other signals like messageChanged ...

        // Test call
        if (backendObj.sendToBackend) backendObj.sendToBackend(\'Hello from React\');
      })
      .catch(error => {
        setConnectionStatus(`Error connecting to backend: ${error.message}`);
        console.error(\'❌ Connection error:\', error);
      });
    // No cleanup needed for backend signals tied to app lifecycle here,
    // as App component mounts once.
  }, []); // Empty dependency array: run once on mount

  function handleIncrementCount() {
    if (backend && backend.incrementCount) {
      try {
        console.log(\'🔄 Calling backend incrementCount method\');
        backend.incrementCount(); // Call C++ slot
        // Count state is updated via the \'countChanged\' signal
      } catch (err) {
        console.error(\'❌ Error calling incrementCount on backend:\', err);
        setCount(prevCount => prevCount + 1); // Fallback
      }
    } else {
      console.log(\'⚠️ No backend, incrementing locally\');
      setCount(prevCount => prevCount + 1); // Fallback
    }
  }

  return (
    <>
      {/* ... JSX for connection status, message ... */}
      <div className=\"card\">
        <button onClick={handleIncrementCount}>
          count is {count}
        </button>
        <p>This count is synced with the C++ backend.</p>
      </div>
      {/* ... other JSX ... */}
    </>
  );
}

export default App;
```

**Key React Points:**
*   **State Management**: `useState` for `count`, `message`, `backend` object, and `connectionStatus`.
*   **Connection Setup**: `useEffect` with an empty dependency array (`[]`) ensures `setupQtConnection` is called once when the `App` component mounts.
*   **Signal Handling**: When a backend signal (e.g., `countChanged`) is received, the callback function updates the React state using `setCount(newCount)`.
*   **Method Calls**: `handleIncrementCount` calls `backend.incrementCount()`. The UI update for the count relies on the `countChanged` signal being received.

### 2. Vue (`src/components/HelloWorld.vue` or `src/App.vue`)

Assuming the logic is in a component like `HelloWorld.vue` from the Vue template:

```html
<script setup>
import { ref, onMounted } from \'vue\';
import { setupQtConnection } from \'../qwebchannel-bridge.js\'; // Adjust path if needed

const count = ref(0);
const message = ref(\'\');
const backend = ref(null);
const connectionStatus = ref(\'Initializing...\');

onMounted(() => {
  console.log(\'Component mounted, setting up Qt connection\');
  connectionStatus.value = \'Connecting to Qt backend...\';

  setupQtConnection()
    .then(backendObj => {
      backend.value = backendObj;
      connectionStatus.value = \'Connected to backend ✓\';
      console.log(\'✅ Successfully connected to backend\');

      // Get initial values
      count.value = backendObj.count !== undefined ? backendObj.count : 0;
      message.value = backendObj.message !== undefined ? backendObj.message : \'\';

      // Connect to signals
      if (backendObj.countChanged && typeof backendObj.countChanged.connect === \'function\') {
        backendObj.countChanged.connect((newCount) => {
          console.log(\'💬 Vue Signal: countChanged received with value:\', newCount);
          count.value = newCount; // Update Vue ref
        });
      }
      // ... connect other signals ...

      if (backendObj.sendToBackend) backendObj.sendToBackend(\'Hello from Vue\');
    })
    .catch(error => {
      connectionStatus.value = `Error connecting: ${error.message}`;
      console.error(\'❌ Connection error:\', error);
    });
});

function incrementCount() {
  if (backend.value && backend.value.incrementCount) {
    try {
      console.log(\'🔄 Calling backend incrementCount method\');
      backend.value.incrementCount(); // Call C++ slot
      // count.value is updated via the \'countChanged\' signal
    } catch (err) {
      console.error(\'❌ Error calling incrementCount on backend:\', err);
      count.value++; // Fallback
    }
  } else {
    console.log(\'⚠️ No backend, incrementing locally\');
    count.value++; // Fallback
  }
}
</script>

<template>
  <!-- ... HTML for connection status, message ... -->
  <div class=\"card\">
    <button type=\"button\" @click=\"incrementCount\">count is {{ count }}</button>
    <p>This count is synced with the C++ backend.</p>
  </div>
  <!-- ... other HTML ... -->
</template>
```

**Key Vue Points:**
*   **Reactivity**: `ref` for `count`, `message`, `backend` object, and `connectionStatus`.
*   **Connection Setup**: `onMounted` hook calls `setupQtConnection` when the component is mounted.
*   **Signal Handling**: Backend signals update Vue `ref`s directly in their callbacks (e.g., `count.value = newCount`).
*   **Method Calls**: `incrementCount` calls `backend.value.incrementCount()`. UI updates via the signal.

### 3. Svelte (`src/App.svelte`)

```html
<script>
  import { onMount } from \'svelte\';
  import { setupQtConnection } from \'./qwebchannel-bridge.js\';
  // Other imports...

  let count = 0;
  let message = \'\';
  let backend = null;
  let connectionStatus = \'Initializing...\';

  onMount(async () => {
    console.log(\'Component mounted, setting up Qt connection\');
    connectionStatus = \'Connecting to Qt backend...\';

    try {
      const backendObj = await setupQtConnection();
      backend = backendObj; // Assign to Svelte reactive variable
      connectionStatus = \'Connected to backend ✓\';
      console.log(\'✅ Successfully connected to backend\');

      // Get initial values
      count = backend?.count !== undefined ? backend.count : 0;
      message = backend?.message !== undefined ? backend.message : \'\';

      // Connect to signals
      if (backend?.countChanged && typeof backend.countChanged.connect === \'function\') {
        backend.countChanged.connect(newCount => {
          console.log(\'💬 Svelte Signal: countChanged received with value:\', newCount);
          count = newCount; // Update Svelte reactive variable
        });
      }
      // ... connect other signals ...

      if (backend?.sendToBackend) backend.sendToBackend(\'Hello from Svelte\');
    } catch (error) {
      connectionStatus = `Error connecting: ${error.message}`;
      console.error(\'❌ Connection error:\', error);
    }
  });

  function handleIncrementCount() {
    if (backend && backend.incrementCount) {
      try {
        console.log(\'🔄 Calling backend incrementCount method\');
        backend.incrementCount(); // Call C++ slot
        // \'count\' is updated via the \'countChanged\' signal
      } catch (err) {
        console.error(\'❌ Error calling incrementCount on backend:\', err);
        count++; // Fallback
      }
    } else {
      console.log(\'⚠️ No backend, incrementing locally\');
      count++; // Fallback
    }
  }
</script>

<main>
  <!-- ... HTML for connection status, message ... -->
  <div class=\"card\">
    <button on:click={handleIncrementCount}>
      count is {count}
    </button>
    <p>This count is synced with the C++ backend.</p>
  </div>
  <!-- ... other HTML ... -->
</main>
```

**Key Svelte Points:**
*   **Reactivity**: `let` keyword makes variables reactive.
*   **Connection Setup**: `onMount` hook calls `setupQtConnection` when the component mounts.
*   **Signal Handling**: Backend signals update Svelte reactive variables directly in their callbacks (e.g., `count = newCount`).
*   **Method Calls**: `handleIncrementCount` calls `backend.incrementCount()`. UI updates via the signal.

---

This document should give you a good starting point for understanding and extending the communication bridge between your chosen frontend and the Qt/C++ backend.
Remember to consult the official Qt QWebChannel documentation for more advanced scenarios. 
