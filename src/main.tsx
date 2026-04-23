import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// Registers the Day 1 AI smoke test on window in dev builds. Safe side-effect
// import — the module does nothing in prod.
import '@/lib/ai'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
