'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { ArrowUturnLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PDFPreviewProps {
  pdfBytes: Uint8Array;
  onBack: () => void;
  onDownload: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ pdfBytes, onBack, onDownload }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Create preview URL from PDF bytes
  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfBytes]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">תצוגה מקדימה</h2>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowUturnLeftIcon className="ml-2 -mr-1 h-5 w-5" />
            חזרה לעריכה
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowDownTrayIcon className="ml-2 -mr-1 h-5 w-5" />
            הורדת הקובץ
          </button>
        </div>
      </div>
      
      <div className="bg-gray-100 rounded-lg p-4 h-[600px]">
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}; 