import React from 'react';
import { Star, Shield, TrendingUp, Award, AlertTriangle } from 'lucide-react';

const TrustScoreDisplay = ({ user, showDetails = false, size = 'medium' }) => {
  const { trust_score = 50, ratings = {}, activity_stats = {} } = user;
  
  const getTrustLevel = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100', icon: Award };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Shield };
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: TrendingUp };
    return { level: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertTriangle };
  };
  
  const trustInfo = getTrustLevel(trust_score);
  const IconComponent = trustInfo.icon;
  
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };
  
  const renderStars = (rating, count) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-200 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">({count})</span>
      </div>
    );
  };
  
  if (!showDetails) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${trustInfo.bgColor}`}>
          <IconComponent className={`w-4 h-4 ${trustInfo.color}`} />
          <span className={`font-medium ${trustInfo.color} ${sizeClasses[size]}`}>
            {trust_score}
          </span>
        </div>
        {ratings.count > 0 && (
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {ratings.average?.toFixed(1)} ({ratings.count})
            </span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Trust Profile</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${trustInfo.bgColor}`}>
          <IconComponent className={`w-5 h-5 ${trustInfo.color}`} />
          <span className={`font-bold ${trustInfo.color}`}>{trust_score}/100</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Trust Level</span>
            <span className={`text-sm font-semibold ${trustInfo.color}`}>
              {trustInfo.level}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                trust_score >= 80 ? 'bg-green-500' :
                trust_score >= 60 ? 'bg-blue-500' :
                trust_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${trust_score}%` }}
            />
          </div>
        </div>
        
        {ratings.count > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">User Rating</span>
              <span className="text-sm font-semibold text-gray-800">
                {ratings.average?.toFixed(1)}/5.0
              </span>
            </div>
            {renderStars(ratings.average || 0, ratings.count)}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {activity_stats.successful_pickups || 0}
            </div>
            <div className="text-xs text-gray-600">Successful</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {((activity_stats.successful_pickups || 0) / 
                Math.max(1, (activity_stats.successful_pickups || 0) + (activity_stats.failed_pickups || 0)) * 100
              ).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>
        
        {ratings.reviews && ratings.reviews.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Reviews</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {ratings.reviews.slice(-3).reverse().map((review, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <div className="flex items-center space-x-1 mb-1">
                    {renderStars(review.rating, 0)}
                    <span className="text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {trust_score < 60 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Improve Your Trust Score</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Complete pickups on time</li>
              <li>• Maintain good communication</li>
              <li>• Provide accurate food information</li>
              <li>• Get positive reviews from users</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustScoreDisplay;