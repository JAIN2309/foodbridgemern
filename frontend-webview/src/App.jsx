import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { loadUser } from './store/slices/authSlice';
import socketService from './services/socket';
import './i18n'; // Initialize i18n

// Pages
import LandingPage from './pages/common/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PasswordReset from './pages/auth/PasswordReset';
import DonorDashboard from './pages/donor/Dashboard';
import NGODashboard from './pages/ngo/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Profile from './pages/common/Profile';
import Settings from './pages/common/Settings';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import SplashScreen from './components/common/SplashScreen';

function App() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    console.log('🚀 APP COMPONENT - TOKEN CHECK:', { token: !!token, user: !!user });
    if (token && !user) {
      console.log('🔄 DISPATCHING LOAD USER...');
      dispatch(loadUser());
    } else if (token && user) {
      // Check if user profile is incomplete
      const requiredFields = ['contact_person', 'phone', 'address'];
      const missingFields = requiredFields.filter(field => !user[field]);
      
      if (missingFields.length > 0) {
        console.log('⚠️ INCOMPLETE PROFILE DETECTED, LOADING FULL DATA...');
        dispatch(loadUser());
      }
    }
  }, [dispatch, token]); // Removed 'user' from dependencies

  useEffect(() => {
    console.log('🔌 AUTH STATE CHANGED:', { isAuthenticated, user: user ? 'present' : 'null' });
    if (isAuthenticated && user) {
      console.log('👤 USER ROLE FOR SOCKET:', user.role);
      // Only connect socket if backend is available
      const connectSocket = async () => {
        try {
          await fetch(import.meta.env.VITE_API_URL || 'http://localhost:5001/api');
          socketService.connect(user.id || user._id, user.role);
        } catch (error) {
          console.warn('Backend not available, skipping socket connection');
        }
      };
      connectSocket();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  const getDashboardComponent = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'donor':
        return <DonorDashboard />;
      case 'ngo':
        return <NGODashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="App">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />
          } />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Register />
          } />
          <Route path="/password-reset" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <PasswordReset />
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                {getDashboardComponent()}
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;