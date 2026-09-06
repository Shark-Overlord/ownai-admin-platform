import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Keep every legacy /#/... link working while allowing real, crawlable paths
// such as /ownai-design and /tutorials/posts/:id to render on direct access.
const Router = window.location.pathname === "/" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
