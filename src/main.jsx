import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IS_PROD } from './lib/env.js'

if (IS_PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
} else if ("serviceWorker" in navigator) {
  // Dev: a service worker left over from a past production run on this origin
  // would keep cache-first-serving a stale page (blank screen) — clean it up.
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then((results) => {
      if (results.some(Boolean) && "caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .then(() => window.location.reload());
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
