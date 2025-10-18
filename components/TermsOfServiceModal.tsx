import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 flex-shrink-0 border-b border-slate-600">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Terms of Service</h2>
                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-700 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto text-gray-300 space-y-4">
            <p className="text-sm text-gray-500">Last updated: July 2024</p>
            
            <h3 className="font-semibold text-white">1. Acceptance of Terms</h3>
            <p>By accessing and using LBWL (the "Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>

            <h3 className="font-semibold text-white">2. Description of Service</h3>
            <p>The Service is an AI-powered application designed to help users learn and practice vocabulary for new languages. The AI features are powered by the Google Gemini API.</p>

            <h3 className="font-semibold text-white">3. User Responsibilities</h3>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>You are responsible for obtaining your own Google Gemini API Key to use the AI features of the Service.</li>
                <li>You are responsible for all activities that occur under your API key, including any costs incurred from its usage with Google's services.</li>
                <li>You agree not to use the Service for any unlawful purpose or to engage in any conduct that is harmful, fraudulent, or deceptive.</li>
            </ul>

            <h3 className="font-semibold text-white">4. Disclaimer of Warranties</h3>
            <p>The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure.</p>
            
            <h3 className="font-semibold text-white">5. Limitation of Liability</h3>
            <p>In no event shall LBWL or its owner be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>

            <h3 className="font-semibold text-white">6. Changes to Terms</h3>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of changes by updating the "Last updated" date of these Terms.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceModal;