import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
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
import ScreenReaderAnnouncer from "./components/common/ScreenReaderAnnouncer.tsx";
import { installApi401UnauthorizedHandler } from "./utils/authSession";

// Install global 401 handler for cookie-based auth
installApi401UnauthorizedHandler();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <AlertProvider>
              <ScreenReaderAnnouncer>
                <AlertContainer />
                <AppWrapper>
                  <App />
                </AppWrapper>
              </ScreenReaderAnnouncer>
            </AlertProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
