import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe, Check } from 'lucide-react';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const languages = [
    { code: 'en', name: t('settings.english'), flag: '🇺🇸' },
    { code: 'hi', name: t('settings.hindi'), flag: '🇮🇳' },
    { code: 'gu', name: t('settings.gujarati'), flag: '🇮🇳' }
  ];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.subtitle') || 'Manage your preferences and account settings'}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Language Settings */}
        <div>
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.language')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.selectLanguage')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  i18n.language === lang.code
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </div>
                {i18n.language === lang.code && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dark Mode Settings */}
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {darkMode ? (
                <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.darkMode')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.darkModeDesc')}</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                darkMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;