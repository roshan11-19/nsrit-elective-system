import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-crimson-200 border-t-crimson-700 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-gray-500">Authenticating credentials...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Role validation
  if (requiredRole && currentUser.role !== requiredRole) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (currentUser.role === 'coordinator') {
      return <Navigate to="/coordinator" replace />;
    } else {
      return <Navigate to="/student" replace />;
    }
  }

  return children;
}
