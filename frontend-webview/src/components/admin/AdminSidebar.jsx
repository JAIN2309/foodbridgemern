import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  MapPin, 
  BarChart3, 
  Settings,
  Shield,
  Bell,
  FileText
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab, stats = {} }) => {
  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      count: null
    },
    {
      id: 'verify',
      label: 'Verify Users',
      icon: UserCheck,
      count: stats.users?.pending || 0,
      urgent: (stats.users?.pending || 0) > 0
    },
    {
      id: 'users',
      label: 'All Users',
      icon: Users,
      count: stats.users?.total || 0
    },
    {
      id: 'map',
      label: 'Live Map',
      icon: MapPin,
      count: stats.donations?.active || 0
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      count: null
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      count: null
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      count: 3 // Mock notification count
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      count: null
    }
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-500">FoodBridge Control</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              
              {item.count !== null && (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  item.urgent 
                    ? 'bg-red-100 text-red-700 animate-pulse' 
                    : isActive 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500">System Status</p>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;