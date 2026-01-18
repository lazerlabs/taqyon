/**
 * QWebChannel Bridge (TypeScript)
 * Adapted for React + Vite + TypeScript template.
 */

type SignalCallback<T = any> = (value: T) => void

type BackendMock = {
  count: number
  message: string
  incrementCount: () => boolean
  setMessage: (msg: string) => boolean
  sendToBackend: (text: string) => boolean
  _listeners: {
    countChanged: SignalCallback<number>[]
    messageChanged: SignalCallback<string>[]
    sendToFrontend: SignalCallback<string>[]
  }
  countChanged: { connect: (cb: SignalCallback<number>) => void }
  messageChanged: { connect: (cb: SignalCallback<string>) => void }
  sendToFrontend: { connect: (cb: SignalCallback<string>) => void }
}

declare global {
  interface Window {
    qt?: {
      webChannelTransport?: any
    }
    QWebChannel?: any
  }
}

class MockQWebChannel {
  constructor(transport: any, callback: (channel: { objects: { backend: BackendMock } }) => void) {
    const mockBackend: BackendMock = {
      count: 0,
      message: 'Hello from Mock Backend (Dev Mode)',
      incrementCount: function () {
        this.count++
        this._listeners.countChanged.forEach(fn => fn(this.count))
        return true
      },
      setMessage: function (msg: string) {
        this.message = msg
        this._listeners.messageChanged.forEach(fn => fn(this.message))
        return true
      },
      sendToBackend: function (text: string) {
        setTimeout(() => {
          this._listeners.sendToFrontend.forEach(fn => fn(`[DEV MODE] Backend received: ${text}`))
        }, 100)
        return true
      },
      _listeners: { countChanged: [], messageChanged: [], sendToFrontend: [] },
      countChanged: { connect: cb => mockBackend._listeners.countChanged.push(cb) },
      messageChanged: { connect: cb => mockBackend._listeners.messageChanged.push(cb) },
      sendToFrontend: { connect: cb => mockBackend._listeners.sendToFrontend.push(cb) },
    }

    callback({ objects: { backend: mockBackend } })
  }
}

export function setupQtConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('Setting up Qt connection...')
    let connectionTimeout: ReturnType<typeof setTimeout> | null = null
    let attemptCount = 0
    const maxAttempts = 20
    const attemptInterval = 500

    const cleanup = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
      }
    }

    const attemptConnection = () => {
      attemptCount++
      console.log(`Attempt ${attemptCount}/${maxAttempts} to connect to Qt backend...`)

      tryQtConnection()
        .then(backend => {
          cleanup()
          console.log('✅ Successfully connected to Qt backend')
          resolve(backend)
        })
        .catch(error => {
          console.warn(`Connection attempt ${attemptCount} failed:`, error.message)
          if (attemptCount < maxAttempts) {
            setTimeout(attemptConnection, attemptInterval)
          } else {
            cleanup()
            console.warn('⚠️ All connection attempts failed, falling back to development mode')
            setupDevMode(resolve)
          }
        })
    }

    connectionTimeout = setTimeout(() => {
      console.warn('⚠️ Qt connection timed out, falling back to development mode')
      setupDevMode(resolve)
    }, 15000)

    attemptConnection()
  })
}

function tryQtConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window.QWebChannel === 'undefined') {
      if (!document.querySelector('script[src*="qwebchannel.js"]')) {
        const script = document.createElement('script')
        script.src = 'qrc:///qtwebchannel/qwebchannel.js'
        document.head.appendChild(script)
      }
      return reject(new Error('QWebChannel class not available'))
    }

    if (!window.qt || !window.qt.webChannelTransport) return reject(new Error('Qt WebChannel transport not available'))

    new window.QWebChannel(window.qt.webChannelTransport, (channel: any) => {
      if (channel.objects && channel.objects.backend) return resolve(channel.objects.backend)
      reject(new Error('Backend object not found in QWebChannel'))
    })
  })
}

function setupDevMode(resolve: (backend: BackendMock) => void) {
  if (!window.qt) {
    window.qt = { webChannelTransport: { send: () => {}, onmessage: () => {} } }
  }
  if (!window.QWebChannel) window.QWebChannel = MockQWebChannel

  new window.QWebChannel(window.qt.webChannelTransport, (channel: { objects: { backend: BackendMock } }) => {
    resolve(channel.objects.backend)
  })
}
