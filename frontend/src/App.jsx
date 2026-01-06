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
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (isAuthenticated && user) {
      socketService.connect(user.id, user.role);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  const getDashboardComponent = () => {
    if (!user) {
      console.log('No user found');
      return null;
    }
    
    console.log('User role:', user.role);
    
    switch (user.role) {
      case 'donor':
        console.log('Rendering DonorDashboard');
        return <DonorDashboard />;
      case 'ngo':
        console.log('Rendering NGODashboard');
        return <NGODashboard />;
      case 'admin':
        console.log('Rendering AdminDashboard');
        return <AdminDashboard />;
      default:
        console.log('Unknown role, redirecting to login');
        return <Navigate to="/login" />;
    }
  };

  return (
    <Router>
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