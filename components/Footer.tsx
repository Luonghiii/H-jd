import React from 'react';
import { Facebook } from 'lucide-react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="w-full text-center py-8 px-4 text-slate-500 dark:text-gray-500 text-sm">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col items-center gap-2">
            <p className="font-bold text-slate-600 dark:text-gray-300">Learn better with Luong</p>
            <a 
              href="https://facebook.com/luonghiii" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
              aria-label="Facebook Profile"
            >
              <Facebook className="w-6 h-6" />
            </a>
        </div>
        <p>© 2025 Luonghii - LBWL. All rights reserved</p>
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <span>v1.0.1</span>
          <span className="text-slate-400 dark:text-gray-600">•</span>
          <button onClick={onOpenPrivacy} className="hover:text-slate-900 dark:hover:text-gray-200 hover:underline">
            Privacy Policy
          </button>
          <span className="text-slate-400 dark:text-gray-600">•</span>
          <button onClick={onOpenTerms} className="hover:text-slate-900 dark:hover:text-gray-200 hover:underline">
            Term of Service
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
