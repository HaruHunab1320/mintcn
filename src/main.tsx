import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Landing } from './landing/landing.tsx';
import { useProjectStore } from './store/project-store.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

// Dev-only handle for Playwright tests + browser console debugging. Wired
// here (not inside App) so it's available on every route, including /learn.
if (import.meta.env.DEV) {
  (window as unknown as { __MINTCN_STORE__: typeof useProjectStore }).__MINTCN_STORE__ =
    useProjectStore;
}

// Poor-man's router. Only two routes exist; a full router library would be
// overkill. The Netlify SPA rewrite in netlify.toml funnels every path to
// this bundle, so /learn hits the same JS and this switch picks the shell.
const pathname = window.location.pathname;
const shell = pathname === '/learn' ? <Landing /> : <App />;

createRoot(root).render(<StrictMode>{shell}</StrictMode>);
