import React from 'react'
import ReactDOM from 'react-dom/client'
import App from "./App";
import "./i18n";
import './index.css'

// leaflet css (dobrze masz 👍)
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline cache is optional; the app still works without registration.
    });
  });
}
