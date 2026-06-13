import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./state/AuthState";
import { ProductStateProvider } from "./state/ProductState";
import { assertProductionConfig } from "./services/config";
import "./styles.css";

assertProductionConfig();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProductStateProvider>
          <App />
        </ProductStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
