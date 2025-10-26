import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

console.log("[main.jsx] App booting");
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {console.log("[main.jsx] StrictMode render")}
    <App />
  </StrictMode>
);
console.log("[main.jsx] App rendered");
