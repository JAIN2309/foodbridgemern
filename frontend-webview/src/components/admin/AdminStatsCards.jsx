import React from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  MapPin, 
  AlertTriangle,
  Heart,
  Target
} from 'lucide-react';

const AdminStatsCards = ({ stats, isLoading }) => {
  const statsCards = [
    {
      title: 'Total Users',
      value: stats.users?.total || 0,
      icon: Users,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Verified Users',
      value: stats.users?.verified || 0,
      icon: CheckCircle,
      color: 'green',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Pending Approval',
      value: stats.users?.pending || 0,
      icon: Clock,
      color: 'yellow',
      change: stats.users?.pending > 5 ? 'High' : 'Normal',
      changeType: stats.users?.pending > 5 ? 'warning' : 'neutral'
    },
    {
      title: 'Active Donations',
      value: stats.donations?.active || 0,
      icon: MapPin,
      color: 'purple',
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Meals Served',
      value: stats.meals_served || 0,
      icon: Heart,
      color: 'red',
      change: '+25%',
      changeType: 'positive'
    },
    {
      title: 'Success Rate',
      value: stats.donations?.total ? 
        `${Math.round((stats.donations.completed / stats.donations.total) * 100)}%` : '0%',
      icon: Target,
      color: 'indigo',
      change: '+3%',
      changeType: 'positive'
    },
    {
      title: 'Total Donations',
      value: stats.donations?.total || 0,
      icon: TrendingUp,
      color: 'emerald',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Issues Reported',
      value: 2, // Mock data
      icon: AlertTriangle,
      color: 'orange',
      change: '-50%',
      changeType: 'positive'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colors[color] || colors.blue;
  };

  const getChangeClasses = (changeType) => {
    switch (changeType) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{card.value}</p>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeClasses(card.changeType)}`}>
                  {card.change}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${getColorClasses(card.color)}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStatsCards;