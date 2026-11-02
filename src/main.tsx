import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from '@/App';
import ShareView from '@/components/ShareView';
import EmbedView from '@/components/EmbedView';
import ApiDocs from '@/components/ApiDocs';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/s" element={<ShareView />} />
        {/* Bare slip for <iframe> embedding; the only route other sites may frame (vercel.json) */}
        <Route path="/e" element={<EmbedView />} />
        {/* Legacy path — old links have no fragment and render the "invalid link" state */}
        <Route path="/share/:shareId" element={<ShareView />} />
        <Route path="/api" element={<ApiDocs />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>
);