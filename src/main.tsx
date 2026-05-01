import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress environmental Vite HMR errors which are expected in this sandbox
  if (event.reason && (
      event.reason.message?.includes('WebSocket') || 
      String(event.reason).includes('WebSocket') ||
      event.reason.message?.includes('vite')
  )) {
    event.preventDefault();
    return;
  }
  console.error('Unhandled Promise Rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
