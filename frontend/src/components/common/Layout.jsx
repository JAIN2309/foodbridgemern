import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, logoutUser } from '../../store/slices/authSlice';
import { useMobile } from '../../hooks/useMobile';
import { 
  Home, 
  Plus, 
  History, 
  Settings, 
  LogOut,
  Users,
  BarChart3,
  User
} from 'lucide-react';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isMobile = useMobile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      console.log('🚪 Frontend logout initiated');
      await dispatch(logoutUser()).unwrap();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still logout locally even if API fails
      dispatch(logout());
    } finally {
      setShowLogoutDialog(false);
    }
  };

  const confirmLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      // Check if we're already on dashboard page
      if (window.location.pathname === '/dashboard') {
        // Send tab change event for dashboard tabs
        const event = new CustomEvent('dashboardTabChange', { detail: item.action });
        window.dispatchEvent(event);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceTabUpdate', { detail: item.action }));
        }, 100);
      } else {
        // Navigate to dashboard with tab parameter
        navigate(`/dashboard?tab=${item.action}`);
      }
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const getNavItems = () => {
    const baseItems = [
      { icon: Home, label: 'Dashboard', id: 'dashboard', action: 'overview' },
    ];

    if (user?.role === 'donor') {
      baseItems.push({ icon: Plus, label: 'Post Food', id: 'post', action: 'post' });
    }

    if (user?.role === 'ngo') {
      baseItems.push({ icon: MapPin, label: 'Live Feed', id: 'feed', action: 'feed' });
    }

    if (user?.role === 'admin') {
      baseItems.push(
        { icon: Users, label: 'Verify Users', id: 'verify', action: 'verify' },
        { icon: BarChart3, label: 'Analytics', id: 'analytics', action: 'analytics' }
      );
    }

    baseItems.push({ icon: History, label: 'History', id: 'history', action: 'history' });

    return baseItems;
  };

  const navItems = getNavItems();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">FoodBridge</h1>
              <p className="text-sm text-gray-600">{user?.organization_name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleProfileClick}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Profile"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={confirmLogout}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content px-4 py-4">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="mobile-nav bg-white border-t shadow-lg">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-primary-600"
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">FoodBridge</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.organization_name}</p>
          <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full mt-2">
            {user?.role?.toUpperCase()}
          </span>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button 
                  onClick={() => handleNavClick(item)}
                  className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleProfileClick}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mb-2 transition-colors"
          >
            <User className="w-5 h-5 mr-3" />
            Profile
          </button>
          <button
            onClick={confirmLogout}
            className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout from your account?</p>
            <div className="flex space-x-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;