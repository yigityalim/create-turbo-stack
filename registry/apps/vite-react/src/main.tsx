import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../index.css";

// biome-ignore lint/style/noNonNullAssertion: index.html always ships #root
const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
