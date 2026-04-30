import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { AlertProvider } from "./context/AlertContext.tsx";
import AlertContainer from "./components/common/AlertContainer.tsx";
import { installApi401UnauthorizedHandler } from "./utils/authSession";

// Install global 401 handler for cookie-based auth
installApi401UnauthorizedHandler();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AlertProvider>
            <AlertContainer />
            <AppWrapper>
              <App />
            </AppWrapper>
          </AlertProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
