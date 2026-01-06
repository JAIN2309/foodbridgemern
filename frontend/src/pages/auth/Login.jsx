import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, X, Building, LogIn } from 'lucide-react';
import { loginUser, clearError } from '../../store/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);

  const watchedEmail = watch('email');

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) || 'Please enter a valid email address';
  };

  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error || 'Login failed');
    }
  };

  React.useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const isEmailValid = watchedEmail ? validateEmail(watchedEmail) === true : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your FoodBridge account</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    validate: validateEmail
                  })}
                  type="email"
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.email ? 'border-red-300 focus:border-red-500' :
                    isEmailValid === true ? 'border-green-300 focus:border-green-500' :
                    isEmailValid === false ? 'border-red-300 focus:border-red-500' :
                    'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {watchedEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isEmailValid ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <X className="w-4 h-4 mr-1" />{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                    showPassword 
                      ? 'text-blue-600 hover:text-blue-700 scale-110' 
                      : 'text-gray-300 hover:text-gray-500'
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Eye className="w-5 h-5 hover:animate-bounce" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <X className="w-4 h-4 mr-1" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Admin Credentials Info */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <LogIn className="w-5 h-5 text-blue-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Admin Access</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p><strong>Email:</strong> admin@foodbridge.com</p>
                    <p><strong>Password:</strong> admin123</p>
                  </div>
                </div>
              </div>
            </div> */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <span className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Create account
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;