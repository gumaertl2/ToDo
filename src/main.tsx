// [2026-10-04] - FEATURE: PWA Update-Wachhund (Service Worker Auto-Reload) integriert, um feststeckende Caches (Zombie-App) bei Updates zu verhindern.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// --- PWA UPDATE WACHHUND ---
if ('serviceWorker' in navigator) {
  // 1. Zwingt die App zum Neuladen, sobald der neue Service Worker übernimmt (skipWaiting)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // 2. Prüft bei JEDEM Öffnen der App (aus dem Hintergrund), ob es ein Update gibt
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().catch(() => console.log('SW Update-Check fehlgeschlagen'));
      });
    }
  });
}
// --- END OF FILE ---
