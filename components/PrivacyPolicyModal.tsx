import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-slate-100/60 backdrop-blur-lg border border-white/30 neu-light rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 flex-shrink-0 border-b border-black/10">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Privacy Policy</h2>
                <button onClick={onClose} className="p-2 text-slate-600 hover:bg-black/5 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto text-slate-700 space-y-4">
            <p className="text-sm text-slate-500">Last updated: July 2024</p>

            <h3 className="font-semibold text-slate-800">Introduction</h3>
            <p>Welcome to LBWL ("we", "us"). We are committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our application.</p>

            <h3 className="font-semibold text-slate-800">Information We Handle</h3>
            <p>Your application data is stored securely in your personal Cloud Firestore database, which is linked to your Firebase Authentication account. We do not store your data on our own servers.</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Vocabulary Words & History:</strong> The vocabulary lists and activity history you create are stored in your Firestore document.</li>
                <li><strong>User API Keys:</strong> Your Google Gemini API Keys are stored in your Firestore document. They are used to make direct calls from the application to the Google Gemini API. We never see or collect your API keys on our servers.</li>
                <li><strong>Application Settings:</strong> Your preferences, such as target language and background settings, are also stored in your Firestore document.</li>
            </ul>

            <h3 className="font-semibold text-slate-800">Third-Party Services</h3>
            <p>The application uses Firebase for authentication and database services, and the Google Gemini API for its AI features. Your use of these features is subject to their respective privacy policies:</p>
             <ul className="list-disc list-inside space-y-1 pl-4">
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google's Privacy Policy</a></li>
            </ul>

            <h3 className="font-semibold text-slate-800">Data Security</h3>
            <p>We leverage Firebase Security Rules to ensure that only you, as the authenticated user, can read or write to your own data document in Firestore. You are responsible for the security of your account and for keeping your API keys confidential.</p>
            
            <h3 className="font-semibold text-slate-800">Changes to This Privacy Policy</h3>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in this modal. You are advised to review this Privacy Policy periodically for any changes.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;