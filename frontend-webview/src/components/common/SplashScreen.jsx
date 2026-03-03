import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete(), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 35);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-green-600 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-8 animate-bounce">
          <div className="relative">
            <Heart 
              className="w-24 h-24 text-white mx-auto animate-pulse" 
              fill="currentColor"
              strokeWidth={1}
            />
            <div className="absolute inset-0 w-24 h-24 mx-auto">
              <div className="w-full h-full rounded-full bg-white/20 animate-ping"></div>
            </div>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl font-bold text-white mb-2 animate-fade-in">
          FoodBridge
        </h1>
        <p className="text-xl text-white/90 mb-8 animate-fade-in-delay">
          Bridging Hunger with Hope
        </p>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mx-auto">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-white/70 mt-4 text-sm">Loading...</p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.6s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
