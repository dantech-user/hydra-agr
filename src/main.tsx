import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import "@fontsource/sora/latin-800.css";
import "./globals.css";
import "./hydra-dark-mode.css";
import HydraApp from "./hydra-app";

// Rebuild marker: classic Hydra Agro interface with dark green mode.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HydraApp />
  </React.StrictMode>,
);
