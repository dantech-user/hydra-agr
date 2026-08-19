import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Moon, Sun } from "lucide-react";
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

type ThemeMode = "light" | "dark";
const THEME_KEY = "hydra-agro.theme";

function HydraThemeRoot() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* armazenamento indisponível */ }
  }, [theme]);

  return (
    <div className={`hydra-root theme-${theme}`}>
      <HydraApp />
      <div className="global-theme-choice" role="group" aria-label="Aparência do aplicativo">
        <span>Aparência</span>
        <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}>
          <Sun size={15} /> Claro
        </button>
        <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>
          <Moon size={15} /> Escuro
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HydraThemeRoot />
  </React.StrictMode>,
);
