import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 flex-shrink-0 border-b border-slate-600">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto text-gray-300 space-y-4">
            <p className="text-sm text-gray-500">Last updated: July 2024</p>

            <h3 className="font-semibold text-white">Introduction</h3>
            <p>Welcome to LBWL ("we", "us"). We are committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our application.</p>

            <h3 className="font-semibold text-white">Information We Handle</h3>
            <p>Our application is designed to function without collecting your personal data on our servers. All data is stored locally on your device within your web browser's storage.</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Vocabulary Words:</strong> The vocabulary lists you create are stored in your browser's localStorage. This data is not transmitted to us.</li>
                <li><strong>API Key:</strong> Your Google Gemini API Key is stored exclusively in your browser's localStorage. It is used to make direct calls from your browser to the Google Gemini API. We never see, collect, or store your API key on our servers.</li>
                <li><strong>Application Settings:</strong> Your preferences, such as target language and background settings, are also stored locally in your browser's localStorage.</li>
            </ul>

            <h3 className="font-semibold text-white">Third-Party Services</h3>
            <p>The application uses the Google Gemini API to provide its AI-powered features. When you use these features, your prompts and API key are sent directly to Google. Your use of these features is subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google's Privacy Policy</a>.</p>

            <h3 className="font-semibold text-white">Data Security</h3>
            <p>We rely on the security features of your web browser to protect the data stored locally. You are responsible for the security of your device and for keeping your API key confidential.</p>
            
            <h3 className="font-semibold text-white">Changes to This Privacy Policy</h3>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in this modal. You are advised to review this Privacy Policy periodically for any changes.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
