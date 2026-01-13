import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { loadUser } from './store/slices/authSlice';
import socketService from './services/socket';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DonorDashboard from './pages/donor/Dashboard';
import NGODashboard from './pages/ngo/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Profile from './pages/common/Profile';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';

function App() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(loadUser());
    }
  }, [dispatch, token, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Only connect socket if backend is available
      const connectSocket = async () => {
        try {
          await fetch(import.meta.env.VITE_API_URL || 'http://localhost:5001/api');
          socketService.connect(user.id, user.role);
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
      <div className="App">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Register />
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
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;