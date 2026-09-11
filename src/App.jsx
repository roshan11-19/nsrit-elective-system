import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Toast from './components/common/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { establishRecoverySession, extractAuthParams } from './lib/authRecovery';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';
import ElectiveSelectionPage from './pages/student/ElectiveSelectionPage';
import MyAllotmentPage from './pages/student/MyAllotmentPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CoordinatorProfilePage from './pages/coordinator/CoordinatorProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import HelpContactPage from './pages/HelpContactPage';
import ResetPasswordPage from './pages/ChangePasswordPage';

// Component that monitors Supabase Auth recovery tokens in the URL
function AuthRecoveryWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function handleRecoveryRoute() {
      const params = extractAuthParams();
      const isRecovery = params.type === 'recovery' || 
                         window.location.href.includes('type=recovery') || 
                         window.location.href.includes('type%3Drecovery');
      const isAuthError = Boolean(params.error || params.error_description);
      const hasTokens = Boolean(params.access_token || params.code || params.token_hash);

      if (isRecovery || hasTokens || (isAuthError && window.location.href.includes('recovery'))) {
        // 1. Establish session from tokens first so they are not lost on hash change
        try {
          if (hasTokens) {
            await establishRecoverySession();
          }
        } catch (err) {
          console.warn('AuthRecoveryWatcher session note:', err);
        }

        // 2. Smoothly redirect to /reset-password if not already on it
        if (location.pathname !== '/reset-password') {
          navigate('/reset-password', { replace: true });
        }
      }
    }

    handleRecoveryRoute();
  }, [location, navigate]);

  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthRecoveryWatcher />
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#171717] font-sans antialiased selection:bg-crimson-100 selection:text-crimson-800">
          <Navbar />
          <Toast />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/help" element={<HelpContactPage />} />

              {/* Student Protected Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/select"
                element={
                  <ProtectedRoute requiredRole="student">
                    <ElectiveSelectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/allotment"
                element={
                  <ProtectedRoute requiredRole="student">
                    <MyAllotmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Coordinator Protected Routes */}
              <Route
                path="/coordinator"
                element={
                  <ProtectedRoute requiredRole="coordinator">
                    <CoordinatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/profile"
                element={
                  <ProtectedRoute requiredRole="coordinator">
                    <CoordinatorProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* College Administrator Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}
