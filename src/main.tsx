import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle unhandled promise rejections and console noise
const suppressEnvErrors = (msg: string) => {
  return msg.includes('WebSocket') || msg.includes('vite') || msg.includes('HMR') || msg.includes('sockjs-node');
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && suppressEnvErrors(event.reason.message || String(event.reason))) {
    event.preventDefault();
    return;
  }
  console.error('Unhandled Promise Rejection:', event.reason);
});

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && suppressEnvErrors(args[0])) return;
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
