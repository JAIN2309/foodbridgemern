import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Users, MapPin, Clock, Shield, TrendingUp, ArrowRight, CheckCircle, Globe } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const features = [
    { icon: Heart, title: t('landing.features.zeroWaste'), desc: t('landing.features.zeroWasteDesc') },
    { icon: Clock, title: t('landing.features.realTime'), desc: t('landing.features.realTimeDesc') },
    { icon: Shield, title: t('landing.features.verified'), desc: t('landing.features.verifiedDesc') },
    { icon: MapPin, title: t('landing.features.location'), desc: t('landing.features.locationDesc') },
    { icon: Users, title: t('landing.features.community'), desc: t('landing.features.communityDesc') },
    { icon: TrendingUp, title: t('landing.features.analytics'), desc: t('landing.features.analyticsDesc') }
  ];

  const roles = [
    {
      title: t('landing.forDonors'),
      desc: t('landing.donorsDesc'),
      benefits: [
        t('landing.donorBenefits.post'),
        t('landing.donorBenefits.track'),
        t('landing.donorBenefits.analytics'),
        t('landing.donorBenefits.badge')
      ],
      color: 'blue'
    },
    {
      title: t('landing.forNgos'),
      desc: t('landing.ngosDesc'),
      benefits: [
        t('landing.ngoBenefits.browse'),
        t('landing.ngoBenefits.reserve'),
        t('landing.ngoBenefits.manage'),
        t('landing.ngoBenefits.build')
      ],
      color: 'green'
    }
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-red-500" fill="currentColor" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                FoodBridge
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {languages.find(l => l.code === i18n.language)?.name || 'English'}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        i18n.language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className={`text-sm font-medium ${
                        i18n.language === lang.code ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                      }`}>
                        {lang.name}
                      </span>
                      {i18n.language === lang.code && (
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors"
              >
                {t('landing.login')}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all"
              >
                {t('landing.getStarted')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <span className="text-blue-600 dark:text-blue-400 font-medium">🌟 {t('landing.tagline')}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            {t('landing.hero').split(',')[0]},
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t('landing.hero').split(',')[1]}
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('landing.heroDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center"
            >
              {t('landing.getStarted')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-lg hover:shadow-lg transition-all"
            >
              {t('landing.learnMore')}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">10K+</div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">{t('landing.mealsServed')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">500+</div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">{t('landing.activeUsers')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">50+</div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">{t('landing.citiesCovered')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.whyChoose')}</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">{t('landing.whyDesc')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.builtForEveryone')}</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">{t('landing.builtDesc')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {roles.map((role, idx) => (
              <div key={idx} className={`p-8 bg-gradient-to-br ${role.color === 'blue' ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'} rounded-2xl border-2 ${role.color === 'blue' ? 'border-blue-200 dark:border-blue-700' : 'border-green-200 dark:border-green-700'}`}>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{role.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{role.desc}</p>
                <ul className="space-y-3">
                  {role.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className={`w-5 h-5 ${role.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'} mr-3 mt-0.5 flex-shrink-0`} />
                      <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">{t('landing.readyToMakeDifference')}</h2>
          <p className="text-xl text-blue-100 mb-8">{t('landing.joinCommunity')}</p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            {t('landing.getStartedNow')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
          <span className="text-white font-semibold">FoodBridge</span>
        </div>
        <p>© 2026 FoodBridge. {t('landing.footer')}</p>
      </footer>
    </div>
  );
};

export default LandingPage;
