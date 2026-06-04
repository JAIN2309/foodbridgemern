import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.jsx';
import './index.css';
import './i18n';

// Sentry — graceful: app still renders even if package not yet installed
// To activate: npm install @sentry/react  then add VITE_SENTRY_DSN to .env
import('@sentry/react')
  .then((Sentry) => {
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.2,
        replaysOnErrorSampleRate: 1.0,
      });
    }
  })
  .catch(() => { /* @sentry/react not installed yet — run: npm install @sentry/react */ });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
