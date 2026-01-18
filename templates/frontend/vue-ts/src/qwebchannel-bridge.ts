/**
 * QWebChannel Bridge (TypeScript)
 * Adapted for Vue + Vite + TypeScript template.
 */

type SignalCallback<T = any> = (value: T) => void;

type BackendMock = {
  count: number;
  message: string;
  incrementCount: () => boolean;
  setMessage: (msg: string) => boolean;
  sendToBackend: (text: string) => boolean;
  _listeners: {
    countChanged: SignalCallback<number>[];
    messageChanged: SignalCallback<string>[];
    sendToFrontend: SignalCallback<string>[];
  };
  countChanged: { connect: (cb: SignalCallback<number>) => void };
  messageChanged: { connect: (cb: SignalCallback<string>) => void };
  sendToFrontend: { connect: (cb: SignalCallback<string>) => void };
};

declare global {
  interface Window {
    qt?: {
      webChannelTransport?: any;
    };
    QWebChannel?: any;
  }
}

// Mock implementation of QWebChannel for development mode
class MockQWebChannel {
  constructor(transport: any, callback: (channel: { objects: { backend: BackendMock } }) => void) {
    console.log('[DEV MODE] Creating mock QWebChannel');

    const mockBackend: BackendMock = {
      count: 0,
      message: "Hello from Mock Backend (Dev Mode)",
      incrementCount: function () {
        this.count++;
        this._listeners.countChanged.forEach(fn => fn(this.count));
        console.log('[DEV MODE] incrementCount called, new count:', this.count);
        return true;
      },
      setMessage: function (msg: string) {
        this.message = msg;
        this._listeners.messageChanged.forEach(fn => fn(this.message));
        return true;
      },
      sendToBackend: function (text: string) {
        console.log('[DEV MODE] sendToBackend called with:', text);
        setTimeout(() => {
          this._listeners.sendToFrontend.forEach(fn =>
            fn(`[DEV MODE] Backend received: ${text}`)
          );
        }, 100);
        return true;
      },
      _listeners: {
        countChanged: [],
        messageChanged: [],
        sendToFrontend: []
      },
      countChanged: {
        connect: function (callback: SignalCallback<number>) {
          mockBackend._listeners.countChanged.push(callback);
        }
      },
      messageChanged: {
        connect: function (callback: SignalCallback<string>) {
          mockBackend._listeners.messageChanged.push(callback);
        }
      },
      sendToFrontend: {
        connect: function (callback: SignalCallback<string>) {
          mockBackend._listeners.sendToFrontend.push(callback);
        }
      }
    };

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
 * @returns Promise<any> Resolves to the backend object when connected
 */
export function setupQtConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('Setting up Qt connection...');
    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;
    let attemptCount = 0;
    const maxAttempts = 20;
    const attemptInterval = 500;

    const cleanup = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };

    const attemptConnection = () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}/${maxAttempts} to connect to Qt backend...`);

      tryQtConnection()
        .then(backend => {
          cleanup();
          resolved = true;
          console.log('✅ Successfully connected to Qt backend');
          resolve(backend);
        })
        .catch(error => {
          console.warn(`Connection attempt ${attemptCount} failed:`, error.message);
          if (attemptCount < maxAttempts) {
            setTimeout(attemptConnection, attemptInterval);
          } else {
            cleanup();
            console.warn('⚠️ All connection attempts failed, falling back to development mode');
            setupDevMode(resolve);
          }
        });
    };

    connectionTimeout = setTimeout(() => {
      if (resolved) return;
      console.warn('⚠️ Qt connection timed out, falling back to development mode');
      setupDevMode(resolve);
    }, 15000);

    attemptConnection();
  });
}

function tryQtConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window.QWebChannel === 'undefined') {
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

    if (!window.qt || !window.qt.webChannelTransport) {
      return reject(new Error('Qt WebChannel transport not available'));
    }

    try {
      console.log('Attempting QWebChannel connection with transport:', window.qt.webChannelTransport);

      new window.QWebChannel(window.qt.webChannelTransport, (channel: any) => {
        if (channel.objects && channel.objects.backend) {
          try {
            const backendType = typeof channel.objects.backend.incrementCount;
            console.log('Backend incrementCount method type:', backendType);

            if (backendType !== 'function') {
              return reject(new Error('Backend object does not have an incrementCount function'));
            }

            resolve(channel.objects.backend);
          } catch (err: any) {
            reject(new Error('Error accessing backend methods: ' + err.message));
          }
        } else {
          reject(new Error('Backend object not found in QWebChannel'));
        }
      });
    } catch (err: any) {
      reject(new Error('QWebChannel connection error: ' + err.message));
    }
  });
}

function setupDevMode(resolve: (backend: BackendMock) => void) {
  console.log('🔄 Setting up development mode');

  if (!window.qt) {
    window.qt = {
      webChannelTransport: {
        send: function (msg: any) { console.log('[DEV MODE] transport send:', msg); },
        onmessage: function (msg: any) { console.log('[DEV MODE] transport received:', msg); }
      }
    };
  }

  if (!window.QWebChannel) {
    window.QWebChannel = MockQWebChannel;
  }

  new window.QWebChannel(window.qt.webChannelTransport, (channel: { objects: { backend: BackendMock } }) => {
    console.log('🔄 Development mode initialized with mock backend');
    resolve(channel.objects.backend);
  });
}
