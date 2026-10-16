import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Local Cairo only (no external font requests). Each weight file declares
// Arabic + Latin subsets with unicode-range, so browsers fetch only what a page uses.
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
