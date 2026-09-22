import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./index.css"; // <-- This must be here
import eruda from "eruda";

if (import.meta.env.DEV || window.location.search.includes("debug")) {
  eruda.init();
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
