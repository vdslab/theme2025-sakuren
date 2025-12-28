import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TestDisplayAllWordClouds } from "./TestDisplayAllWordClouds";
// import { App } from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* <App /> */}
    <TestDisplayAllWordClouds />
  </StrictMode>
);
