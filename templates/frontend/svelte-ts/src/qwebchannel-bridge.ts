/**
 * QWebChannel Bridge
 * 
 * This file provides functionality to interface with Qt's QWebChannel.
 * It handles both real Qt backend connections and fallback mock implementations
 * for development mode.
 */

// Mock implementation of QWebChannel for development mode
class MockQWebChannel {
  constructor(transport, callback) {
    console.log('[DEV MODE] Creating mock QWebChannel');
    
    // Create mock backend object
    const mockBackend = {
      count: 0,
      message: "Hello from Mock Backend (Dev Mode)",
      
      // Mock methods with signal triggers
      incrementCount: function() {
        this.count++;
        // Trigger signal handlers
        this._listeners.countChanged.forEach(fn => fn(this.count));
        console.log('[DEV MODE] incrementCount called, new count:', this.count);
        return true;
      },
      
      setMessage: function(msg) {
        this.message = msg;
        // Trigger signal handlers
        this._listeners.messageChanged.forEach(fn => fn(this.message));
        return true;
      },
      
      sendToBackend: function(text) {
        console.log('[DEV MODE] sendToBackend called with:', text);
        // Echo back to frontend
        setTimeout(() => {
          this._listeners.sendToFrontend.forEach(fn => 
            fn(`[DEV MODE] Backend received: ${text}`)
          );
        }, 100);
        return true;
      },
      
      // Storage for connected signal handlers
      _listeners: {
        countChanged: [],
        messageChanged: [],
        sendToFrontend: []
      },
      
      // Signal connection methods
      countChanged: { 
        connect: function(callback) { 
          mockBackend._listeners.countChanged.push(callback); 
        } 
      },
      messageChanged: { 
        connect: function(callback) { 
          mockBackend._listeners.messageChanged.push(callback); 
        } 
      },
      sendToFrontend: { 
        connect: function(callback) { 
          mockBackend._listeners.sendToFrontend.push(callback); 
        } 
      }
    };
    
    // Call the callback with the mock objects
    callback({
      objects: {
        backend: mockBackend
      }
    });
  }
}

/**
 * Setup Qt/QWebChannel connectivity
 * Handles both real Qt connections and fallback to development mode
 * 
 * @returns {Promise} Resolves to the backend object when connected
 */
export function setupQtConnection() {
  return new Promise((resolve, reject) => {
    console.log('Setting up Qt connection...');
    let connectionTimeout;
    let resolved = false;
    let attemptCount = 0;
    const maxAttempts = 20;  // Increase max attempts
    const attemptInterval = 500; // Time between attempts in ms
    
    // Function to clean up after connection
    const cleanup = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };
    
    // Function to make a connection attempt
    const attemptConnection = () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}/${maxAttempts} to connect to Qt backend...`);
      
      // Try to connect to real Qt backend
      tryQtConnection()
        .then(backend => {
          cleanup();
          resolved = true;
          console.log('✅ Successfully connected to Qt backend');
          resolve(backend);
        })
        .catch(error => {
          console.warn(`Connection attempt ${attemptCount} failed:`, error.message);
          
          // If we still have attempts left, try again
          if (attemptCount < maxAttempts) {
            setTimeout(attemptConnection, attemptInterval);
          } else {
            cleanup();
            console.warn('⚠️ All connection attempts failed, falling back to development mode');
            setupDevMode(resolve);
          }
        });
    };
    
    // Set a longer timeout for overall connection attempts
    connectionTimeout = setTimeout(() => {
      if (resolved) return;
      console.warn('⚠️ Qt connection timed out, falling back to development mode');
      setupDevMode(resolve);
    }, 15000); // 15 seconds total timeout
    
    // Start connection attempts
    attemptConnection();
  });
}

/**
 * Try to connect to the Qt backend via QWebChannel
 * 
 * @returns {Promise} Resolves to the backend object if successful
 */
function tryQtConnection() {
  return new Promise((resolve, reject) => {
    // First, ensure Qt is really loaded - sometimes it takes time
    if (typeof QWebChannel === 'undefined') {
      // Try to load QWebChannel from Qt resource manually
      if (!document.querySelector('script[src*="qwebchannel.js"]')) {
        try {
          const script = document.createElement('script');
          script.src = 'qrc:///qtwebchannel/qwebchannel.js';
          document.head.appendChild(script);
          console.log('Tried to manually load QWebChannel script');
        } catch (e) {
          console.error('Error loading QWebChannel script:', e);
        }
      }
      return reject(new Error('QWebChannel class not available'));
    }
    
    // Check if Qt transport is available - this is critical
    if (!window.qt || !window.qt.webChannelTransport) {
      return reject(new Error('Qt WebChannel transport not available'));
    }
    
    try {
      console.log('Attempting QWebChannel connection with transport:', window.qt.webChannelTransport);
      
      // Connect to QWebChannel
      new window.QWebChannel(window.qt.webChannelTransport, channel => {
        // Check if backend object exists
        if (channel.objects && channel.objects.backend) {
          // Test the backend 
          try {
            const backendType = typeof channel.objects.backend.incrementCount;
            console.log('Backend incrementCount method type:', backendType);
            
            if (backendType !== 'function') {
              return reject(new Error('Backend object does not have an incrementCount function'));
            }
            
            resolve(channel.objects.backend);
          } catch (err) {
            reject(new Error('Error accessing backend methods: ' + err.message));
          }
        } else {
          reject(new Error('Backend object not found in QWebChannel'));
        }
      });
    } catch (err) {
      reject(new Error('QWebChannel connection error: ' + err.message));
    }
  });
}

/**
 * Set up development mode with mock backend
 * 
 * @param {Function} resolve Callback to resolve with mock backend
 */
function setupDevMode(resolve) {
  console.log('🔄 Setting up development mode');
  
  // Create mock Qt transport if needed
  if (!window.qt) {
    window.qt = {
      webChannelTransport: {
        send: function(msg) { console.log('[DEV MODE] transport send:', msg); },
        onmessage: function(msg) { console.log('[DEV MODE] transport received:', msg); }
      }
    };
  }
  
  // Use our mock QWebChannel implementation
  if (!window.QWebChannel) {
    window.QWebChannel = MockQWebChannel;
  }
  
  // Connect using the mock or injected QWebChannel
  new window.QWebChannel(window.qt.webChannelTransport, channel => {
    console.log('🔄 Development mode initialized with mock backend');
    resolve(channel.objects.backend);
  });
} 
