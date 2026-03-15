import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a splash screen or loading spinner while restoring session
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-primary text-white">
        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <span className="text-2xl font-game font-bold text-primary">ML</span>
        </div>
        <div className="w-6 h-6 border-4 border-secondary border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
