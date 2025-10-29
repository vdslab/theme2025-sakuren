import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TilegramApp } from "./TilegramApp";
// import { App } from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* <App /> */}
    <TilegramApp />
  </StrictMode>
);
