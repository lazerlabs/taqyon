import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { setupQtConnection } from './qwebchannel-bridge'

type Backend = {
  count?: number
  countChanged?: { connect: (cb: (newCount: number) => void) => void }
  incrementCount?: () => void
}

export default function App() {
  const [count, setCount] = useState(0)
  const [backend, setBackend] = useState<Backend | null>(null)

  useEffect(() => {
    setupQtConnection().then((backendObj: Backend) => {
      setBackend(backendObj)
      setCount(backendObj.count ?? 0)
      backendObj.countChanged?.connect?.(setCount)
    })
  }, [])

  const status = useMemo(() => (backend ? 'connected' : 'connecting…'), [backend])

  function onIncrement() {
    if (backend?.incrementCount) {
      backend.incrementCount()
      return
    }
    setCount(c => c + 1)
  }

  return (
    <div className="app">
      <h1>Hello World</h1>
      <div className="row">
        <div>Count: {count}</div>
        <button onClick={onIncrement}>Increment</button>
      </div>
      <div className="hint">
        Backend status: {status}. In the Qt app this syncs with C++; in <code>npm run dev</code> it uses a mock backend.
      </div>
    </div>
  )
}

