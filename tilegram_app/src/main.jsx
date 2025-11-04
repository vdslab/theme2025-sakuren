import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CartogramApp } from "./CartogramApp";
// import { App } from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* <App /> */}
    <CartogramApp />
  </StrictMode>
);
