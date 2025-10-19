import React from 'react';
import { Facebook } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  const { t } = useI18n();

  const gradientText = "animated-gradient-text";

  return (
    <footer className="w-full text-center pt-8 pb-24 px-4 text-sm">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col items-center gap-2">
            <p className={`font-bold text-base ${gradientText}`}>{t('footer.credit')}</p>
            <a 
              href="https://facebook.com/luonghiii" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-800 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label="Facebook Profile"
            >
              <Facebook className="w-6 h-6" />
            </a>
        </div>
        <p className={gradientText}>{t('footer.copyright')}</p>
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <span className={gradientText}>v1.0.1</span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <button onClick={onOpenPrivacy} className={`${gradientText} font-medium hover:opacity-80 transition-opacity`}>
            {t('footer.privacy_policy')}
          </button>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <button onClick={onOpenTerms} className={`${gradientText} font-medium hover:opacity-80 transition-opacity`}>
            {t('footer.terms_of_service')}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;