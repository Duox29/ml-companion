import { useState, useEffect } from "react";
import AuthFlow from "./screens/Auth";
import MainApp from "./screens/MainApp";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authInitialStep, setAuthInitialStep] = useState<"splash" | "login" | "register">("splash");

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

  const handleLogin = (guest = false) => {
    setIsGuest(guest);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setAuthInitialStep("splash");
  };

  const handleRequireAuth = (step: "login" | "register") => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setAuthInitialStep(step);
  };

  return (
    <div className="h-[100dvh] w-full bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-gray-100 overflow-hidden flex flex-col font-sans pt-safe pb-safe">
      {!isAuthenticated ? (
        <AuthFlow onLogin={handleLogin} initialStep={authInitialStep} />
      ) : (
        <MainApp isGuest={isGuest} onLogout={handleLogout} onRequireAuth={handleRequireAuth} />
      )}
    </div>
  );
}
