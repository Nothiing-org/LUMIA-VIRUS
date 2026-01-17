
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handling for debugging hosting issues
window.onerror = (message, source, lineno, colno, error) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:20px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
  errorDiv.textContent = `CRITICAL ERROR: ${message}\nAt: ${source}:${lineno}:${colno}\n\n${error?.stack || ''}`;
  document.body.appendChild(errorDiv);
};

window.onunhandledrejection = (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:orange;color:white;padding:20px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
  errorDiv.textContent = `UNHANDLED PROMISE REJECTION: ${event.reason}`;
  document.body.appendChild(errorDiv);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:sans-serif;background:#030712;color:white;"><h1>Mounting point not found.</h1></div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err: any) {
  document.body.innerHTML = `<div style="padding:40px;font-family:monospace;background:#030712;color:#ef4444;"><h1>Render Crash</h1><pre>${err?.stack || err}</pre></div>`;
}
