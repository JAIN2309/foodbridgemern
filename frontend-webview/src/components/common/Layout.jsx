import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  User,
  MapPin
} from 'lucide-react';

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector((state) => state.auth);
  const isMobile = useMobile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 Frontend logout initiated');
      await dispatch(logoutUser()).unwrap();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      dispatch(logout());
    } finally {
      setIsLoggingOut(false);
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
      baseItems.push({ icon: Plus, label: 'Post Food', id: 'postFood', action: 'post' });
    }

    if (user?.role === 'ngo') {
      baseItems.push({ icon: MapPin, label: 'Live Feed', id: 'liveFeed', action: 'feed' });
    }

    if (user?.role === 'admin') {
      baseItems.push(
        { icon: Users, label: 'Verify Users', id: 'verifyUsers', action: 'verify' },
        { icon: BarChart3, label: 'Analytics', id: 'analytics', action: 'analytics' }
      );
    }

    baseItems.push({ icon: History, label: 'History', id: 'history', action: 'history' });
    baseItems.push({ icon: Settings, label: 'Settings', id: 'settings', path: '/settings' });

    return baseItems;
  };

  const navItems = getNavItems();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FoodBridge</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">{user?.organization_name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleProfileClick}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                title="Profile"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={confirmLogout}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                title="Logout"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 dark:border-gray-300 border-t-transparent" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content px-4 py-4 dark:bg-gray-900">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="mobile-nav bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="flex flex-col items-center py-2 px-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{t(`layout.${item.id}`)}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm flex flex-col h-screen">
        <div className="p-6 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">FoodBridge</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{user?.organization_name}</p>
          <span className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full mt-2">
            {user?.role?.toUpperCase()}
          </span>
        </div>
        
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button 
                  onClick={() => handleNavClick(item)}
                  className="w-full flex items-center px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors font-medium"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {t(`layout.${item.id}`)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={handleProfileClick}
            className="w-full flex items-center px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg mb-2 transition-colors font-medium"
          >
            <User className="w-5 h-5 mr-3" />
            {t('layout.profile')}
          </button>
          <button
            onClick={confirmLogout}
            className="w-full flex items-center px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors disabled:opacity-50 font-medium"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 dark:border-red-400 border-t-transparent mr-3" />
            ) : (
              <LogOut className="w-5 h-5 mr-3" />
            )}
            {isLoggingOut ? t('layout.loggingOut') : t('layout.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 dark:bg-gray-900">
        {children}
      </main>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('layout.confirmLogout')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('layout.logoutMessage')}</p>
            <div className="flex space-x-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {t('layout.loggingOut')}
                  </>
                ) : (
                  t('layout.yesLogout')
                )}
              </button>
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                {t('layout.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;