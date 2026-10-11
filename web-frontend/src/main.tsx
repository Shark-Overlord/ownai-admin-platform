import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Keep every legacy /#/... link working while allowing real, crawlable paths
// such as /ownai-design and /tutorials/posts/:id to render on direct access.
const Router = window.location.pathname === "/" ? HashRouter : BrowserRouter;

// /api/seo/render injects crawlable HTML into #root plus page JSON-LD. React
// replaces #root on mount (createRoot, not hydrateRoot); drop the JSON-LD so
// useDocumentMeta stays the single client-side source of structured data.
document.getElementById("ssr-structured-data")?.remove();
document.getElementById("ssr-fallback-style")?.remove();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
