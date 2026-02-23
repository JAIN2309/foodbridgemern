import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  RefreshCw, 
  Download,
  Settings,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const AdminHeader = ({ onRefresh, isLoading, lastUpdated }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const notifications = [
    {
      id: 1,
      type: 'urgent',
      title: 'New User Verification',
      message: '3 users pending approval',
      time: '2 min ago'
    },
    {
      id: 2,
      type: 'info',
      title: 'System Update',
      message: 'Platform maintenance scheduled',
      time: '1 hour ago'
    },
    {
      id: 3,
      type: 'success',
      title: 'Donation Completed',
      message: '50 meals served successfully',
      time: '3 hours ago'
    }
  ];

  const handleLogout = () => {
    dispatch(logout());
  };

  const getNotificationIcon = (type) => {
    const baseClasses = "w-2 h-2 rounded-full";
    switch (type) {
      case 'urgent': return `${baseClasses} bg-red-500`;
      case 'info': return `${baseClasses} bg-blue-500`;
      case 'success': return `${baseClasses} bg-green-500`;
      default: return `${baseClasses} bg-gray-500`;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Title and search */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">
              {lastUpdated && `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
            </p>
          </div>
          
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users, donations..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
            />
          </div>
        </div>

        {/* Right side - Actions and profile */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export Data"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className={getNotificationIcon(notification.type)}></div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user?.organization_name || 'Admin'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;