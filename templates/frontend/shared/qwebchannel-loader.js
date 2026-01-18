/**
 * QWebChannel Loader
 * 
 * This script is loaded by Qt WebEngine to ensure QWebChannel is properly 
 * set up for communication between Qt C++ and JavaScript.
 */

// Log that this script is loaded
console.log('QWebChannel loader script loaded');

// Wait for document to be ready
function init() {
  console.log('QWebChannel loader initializing');
  
  // Ensure the qt object exists
  if (typeof window.qt === 'undefined') {
    console.log('Creating qt object placeholder');
    window.qt = {};
  }
  
  // Try to load QWebChannel from Qt resources if not available
  tryLoadQWebChannel();
}

// Function to try loading QWebChannel
function tryLoadQWebChannel() {
  // Check if QWebChannel is already available
  if (typeof QWebChannel !== 'undefined') {
    console.log('QWebChannel is already available');
    window.qtWebChannelLoaded = true;
    checkTransport();
    return;
  }
  
  console.log('QWebChannel not available - attempting to load it');
  
  // Try to load QWebChannel from Qt resource
  const script = document.createElement('script');
  script.src = 'qrc:///qtwebchannel/qwebchannel.js';
  script.async = false;
  
  script.onload = () => {
    console.log('Successfully loaded QWebChannel from Qt resources');
    window.qtWebChannelLoaded = true;
    
    // Create a custom event to notify app
    const event = new CustomEvent('qtwebchannel-loaded');
    window.dispatchEvent(event);
    
    // Check transport after loading
    checkTransport();
  };
  
  script.onerror = () => {
    console.error('Failed to load QWebChannel from Qt resources');
    
    // Try again with a slight delay (Qt might not be fully initialized yet)
    setTimeout(() => {
      // If still no QWebChannel, try once more or notify failure
      if (typeof QWebChannel === 'undefined') {
        tryLoadQWebChannel();
      }
    }, 500);
  };
  
  document.head.appendChild(script);
}

// Function to check WebChannel transport
function checkTransport() {
  // Check qt.webChannelTransport
  if (window.qt.webChannelTransport) {
    console.log('✅ Qt WebChannel transport is available - C++/JS communication will work');
    
    // Create a custom event to notify app
    const event = new CustomEvent('qtwebchanneltransport-ready');
    window.dispatchEvent(event);
    
    // Set up console logging to forward to Qt
    setupConsoleForwarding();
  } else {
    console.error('❌ Qt WebChannel transport is not available - communication with C++ backend will not work');
    
    // In case transport becomes available later
    setTimeout(() => {
      if (window.qt.webChannelTransport) {
        console.log('✅ Qt WebChannel transport became available');
        const event = new CustomEvent('qtwebchanneltransport-ready');
        window.dispatchEvent(event);
        
        // Set up console logging once transport is available
        setupConsoleForwarding();
      }
    }, 1000);
  }
}

// Function to set up console message forwarding to Qt
function setupConsoleForwarding() {
  // Only set up forwarding if not already done
  if (window._consoleForwardingSetup) {
    return;
  }
  
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Override console.log
  console.log = function() {
    const args = Array.prototype.slice.call(arguments);
    const message = args.join(' ');
    
    // Forward to Qt if transport is available
    if (window.qt && window.qt.webChannelTransport) {
      window.qt.webChannelTransport.consoleLog = message;
    }
    
    // Call original method
    originalConsoleLog.apply(console, args);
  };
  
  // Override console.error
  console.error = function() {
    const args = Array.prototype.slice.call(arguments);
    const message = args.join(' ');
    
    // Forward to Qt if transport is available
    if (window.qt && window.qt.webChannelTransport) {
      window.qt.webChannelTransport.consoleError = message;
    }
    
    // Call original method
    originalConsoleError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function() {
    const args = Array.prototype.slice.call(arguments);
    const message = args.join(' ');
    
    // Forward to Qt if transport is available
    if (window.qt && window.qt.webChannelTransport) {
      window.qt.webChannelTransport.consoleWarn = message;
    }
    
    // Call original method
    originalConsoleWarn.apply(console, args);
  };
  
  // Mark as set up
  window._consoleForwardingSetup = true;
  console.log('Console message forwarding to Qt enabled');
}

// Run initialization when document is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 