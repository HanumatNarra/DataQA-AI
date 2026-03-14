import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DemoModalProps {
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">DataQA.ai Demo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">How it works:</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">1</div>
                  <h4 className="font-semibold text-gray-800 mb-2">Upload Data</h4>
                  <p className="text-gray-600 text-sm">Upload your CSV, Excel, or JSON files</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">2</div>
                  <h4 className="font-semibold text-gray-800 mb-2">Ask Questions</h4>
                  <p className="text-gray-600 text-sm">Ask questions in plain English</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">3</div>
                  <h4 className="font-semibold text-gray-800 mb-2">Get Insights</h4>
                  <p className="text-gray-600 text-sm">Receive answers and visualizations</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Example Queries:</h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-200">
                  <p className="text-gray-700 font-medium">{'"How many orders do we have per status?"'}</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 border border-green-200">
                  <p className="text-gray-700 font-medium">{'"Show me customers by country"'}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
                  <p className="text-gray-700 font-medium">{'"Plot revenue trends over time"'}</p>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
                  <p className="text-gray-700 font-medium">{'"Which products are top sellers?"'}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
