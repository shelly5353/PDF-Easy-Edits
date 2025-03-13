'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { ArrowUturnLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { pdfjs } from 'react-pdf';

// הגדרה של ה-worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

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
        <h2 className="text-xl font-semibold">תצוגה מקדימה</h2>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <ArrowUturnLeftIcon className="ml-2 -mr-1 h-5 w-5" />
            חזרה לעריכה
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <ArrowDownTrayIcon className="ml-2 -mr-1 h-5 w-5" />
            הורדת הקובץ
          </button>
        </div>
      </div>
      
      <div className="bg-surface rounded-lg p-4 h-[600px] border border-border">
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
          style={{ backgroundColor: 'white' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}; 