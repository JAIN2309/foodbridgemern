import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: t('settings.english'), flag: '🇺🇸' },
    { code: 'hi', name: t('settings.hindi'), flag: '🇮🇳' },
    { code: 'gu', name: t('settings.gujarati'), flag: '🇮🇳' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 backdrop-blur-lg border border-white/30 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-lg hover:shadow-xl hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 group"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600 group-hover:text-purple-600 transition-colors duration-300" />
          <span className="text-xs font-semibold">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md group ${
                    i18n.language === lang.code 
                      ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 shadow-sm' 
                      : 'text-gray-700 hover:text-blue-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <span className="font-semibold">{lang.name}</span>
                  </div>
                  {i18n.language === lang.code && (
                    <div className="bg-blue-100 rounded-full p-1">
                      <Check className="w-3 h-3 text-blue-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Bottom accent */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;