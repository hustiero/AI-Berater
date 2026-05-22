import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './FinanzCoach.jsx';
import './index.css';

// window.storage Polyfill -> localStorage (für echte Browser).
// Im Artifact-Sandbox-Setup stellt die Runtime window.storage selbst bereit.
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async getItem(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    async setItem(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    },
    async removeItem(key) {
      try { localStorage.removeItem(key); } catch {}
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
