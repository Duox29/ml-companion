import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AuthFlow from "./screens/Auth";
import MainApp from "./screens/MainApp";
import { storage, AUTH_KEYS, APP_KEYS } from "./services/storage";

const ONBOARDING_VERSION = "v2";

export default function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [authInitialStep, setAuthInitialStep] = useState<"splash" | "login" | "register">("splash");
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Prevent default context menu (long press) on mobile to feel more like a native app
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      // Allow context menu on inputs and textareas
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const [accessToken, userData, guestMode, onboardingVersion] = await Promise.all([
          storage.get(AUTH_KEYS.ACCESS_TOKEN),
          storage.get(AUTH_KEYS.USER_DATA),
          storage.get(AUTH_KEYS.GUEST_MODE),
          storage.get(APP_KEYS.ONBOARDING_VERSION),
        ]);

        if (!isMounted) {
          return;
        }

        const onboardingCompleted = onboardingVersion === ONBOARDING_VERSION;
        setHasCompletedOnboarding(onboardingCompleted);
        setAuthInitialStep(onboardingCompleted ? "login" : "splash");

        if (accessToken && userData) {
          setIsGuest(false);
          setIsAuthenticated(true);
          return;
        }

        if (guestMode === "true") {
          setIsGuest(true);
          setIsAuthenticated(true);
          return;
        }

        if (!onboardingCompleted) {
          // Force intro/auth flow on first open, including wiki route.
          setIsGuest(false);
          setIsAuthenticated(false);
          return;
        }

        // Default anonymous mode: allow browsing Wiki without login.
        setIsGuest(true);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to restore app session:", error);
        if (isMounted) {
          // Fallback to anonymous mode if session restore fails.
          setIsGuest(true);
          setIsAuthenticated(true);
          setAuthInitialStep("splash");
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      // Keep app accessible in anonymous mode after token/session invalidation.
      setIsAuthenticated(true);
      setIsGuest(true);
      setAuthInitialStep("login");
    };

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  const handleLogin = async (guest = false) => {
    await Promise.all([
      storage.set(APP_KEYS.ONBOARDING_DONE, "true"),
      storage.set(APP_KEYS.ONBOARDING_VERSION, ONBOARDING_VERSION),
    ]);
    await storage.set(AUTH_KEYS.GUEST_MODE, guest ? "true" : "false");
    setHasCompletedOnboarding(true);
    setIsGuest(guest);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await Promise.all([
      storage.remove(AUTH_KEYS.ACCESS_TOKEN),
      storage.remove(AUTH_KEYS.REFRESH_TOKEN),
      storage.remove(AUTH_KEYS.USER_DATA),
      storage.remove(AUTH_KEYS.GUEST_MODE),
    ]);
    setIsAuthenticated(false);
    setIsGuest(false);
    setAuthInitialStep("login");
  };

  const handleRequireAuth = async (step: "login" | "register") => {
    await storage.remove(AUTH_KEYS.GUEST_MODE);
    await Promise.all([
      storage.set(APP_KEYS.ONBOARDING_DONE, "true"),
      storage.set(APP_KEYS.ONBOARDING_VERSION, ONBOARDING_VERSION),
    ]);
    setHasCompletedOnboarding(true);
    setIsAuthenticated(false);
    setIsGuest(false);
    setAuthInitialStep(step);
  };

  if (isBootstrapping) {
    return (
      <div className="h-[100dvh] w-full bg-primary text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-secondary border-t-accent rounded-full animate-spin mb-4"></div>
          <span className="text-sm text-secondary/90">Restoring session...</span>
        </div>
      </div>
    );
  }

  const isWikiRoute =
    location.pathname === "/" || location.pathname.startsWith("/wiki");
  const shouldShowAuthFlow = !isAuthenticated && (!isWikiRoute || !hasCompletedOnboarding);
  const effectiveGuest = isGuest || !isAuthenticated;

  return (
    <div className="h-[100dvh] w-full bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-gray-100 overflow-hidden flex flex-col font-sans">
      {shouldShowAuthFlow ? (
        <AuthFlow onLogin={handleLogin} initialStep={authInitialStep} />
      ) : (
        <MainApp isGuest={effectiveGuest} onLogout={handleLogout} onRequireAuth={handleRequireAuth} />
      )}
    </div>
  );
}
