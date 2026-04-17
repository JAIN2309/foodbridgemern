import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Leaf, Zap, ShieldCheck, MapPin, UserPlus, PlusCircle, Hand, CheckCircle, Mail } from 'lucide-react';

const FEATURES = [
  { icon: Leaf, key: 'zeroWaste', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: Zap, key: 'realTime', color: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: ShieldCheck, key: 'verified', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: MapPin, key: 'location', color: 'text-purple-600', bg: 'bg-purple-50' },
];

const STEPS = [
  { icon: UserPlus, key: 'register', color: 'bg-blue-600' },
  { icon: PlusCircle, key: 'post', color: 'bg-green-600' },
  { icon: Hand, key: 'claim', color: 'bg-orange-600' },
  { icon: CheckCircle, key: 'collect', color: 'bg-purple-600' },
];

const STATS = [
  { value: '50K+', key: 'meals', color: 'text-blue-600', icon: '🍽️' },
  { value: '200+', key: 'donors', color: 'text-green-600', icon: '🏢' },
  { value: '150+', key: 'ngos', color: 'text-purple-600', icon: '👥' },
  { value: '50+', key: 'cities', color: 'text-orange-600', icon: '📍' },
];

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white border-opacity-30">
            <Heart className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black mb-2">FoodBridge</h1>
          <p className="text-lg opacity-90 mb-4">{t('about.tagline')}</p>
          <div className="w-12 h-1 bg-white opacity-40 rounded mx-auto mb-4" />
          <p className="text-sm opacity-85 max-w-2xl mx-auto leading-relaxed">{t('about.mission')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{t(`about.stats.${stat.key}`)}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('about.features.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className={`w-12 h-12 ${feature.bg} dark:bg-opacity-20 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t(`about.features.${feature.key}`)}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t(`about.features.${feature.key}Desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it Works */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('about.howItWorks')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 ${step.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                    {i + 1}
                  </div>
                  <div className={`w-10 h-10 ${step.color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${step.color.replace('bg-', 'text-')}`} />
                  </div>
                  <p className="flex-1 text-gray-700 dark:text-gray-300 font-medium">{t(`about.steps.${step.key}`)}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 h-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-xl p-8 text-center text-white shadow-lg">
        <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black mb-3">{t('about.team')}</h2>
        <p className="text-sm opacity-90 max-w-2xl mx-auto leading-relaxed">{t('about.teamDesc')}</p>
      </div>

      {/* Contact */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('about.contact').toUpperCase()}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <a 
            href={`mailto:${t('about.contactEmail')}`}
            className="flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-lg transition-colors"
          >
            <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t('about.contact')}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{t('about.contactEmail')}</div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-pink-600" />
          <span className="text-base font-black text-gray-900 dark:text-white">FoodBridge</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('about.version')} 1.0.0</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('about.madeWith')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('about.rights')}</p>
      </div>
    </div>
  );
};

export default About;
