import React from 'react';
import { Facebook } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  const { t } = useI18n();

  return (
    <footer className="w-full text-center pt-8 pb-24 px-4 text-gray-500 dark:text-gray-300 text-sm">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col items-center gap-2">
            <p className="font-bold text-gray-600 dark:text-gray-300">{t('footer.credit')}</p>
            <a 
              href="https://facebook.com/luonghiii" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Facebook Profile"
            >
              <Facebook className="w-6 h-6" />
            </a>
        </div>
        <p>{t('footer.copyright')}</p>
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <span>v1.0.1</span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <button onClick={onOpenPrivacy} className="hover:text-gray-900 dark:hover:text-gray-100 hover:underline">
            {t('footer.privacy_policy')}
          </button>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <button onClick={onOpenTerms} className="hover:text-gray-900 dark:hover:text-gray-100 hover:underline">
            {t('footer.terms_of_service')}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;