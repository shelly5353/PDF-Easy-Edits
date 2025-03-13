'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { ArrowUturnLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };
  
  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (numPages) {
      setPageNumber(prev => Math.min(prev + 1, numPages));
    }
  };
  
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
      
      <div className="bg-surface rounded-lg p-4 h-[600px] border border-border overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="loading-spinner"></div>
              <span className="text-text-secondary">טוען מסמך...</span>
            </div>
          </div>
        )}
        
        <Document
          file={new Blob([pdfBytes], { type: 'application/pdf' })}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="loading-spinner"></div>
                <span className="text-text-secondary">טוען מסמך...</span>
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-xl flex justify-center p-4 shadow-md" style={{ backgroundColor: 'white' }}>
              <Page
                pageNumber={pageNumber}
                width={Math.min(window.innerWidth * 0.6, 800)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="rounded-lg"
              />
            </div>
            
            {numPages && numPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 w-full">
                <button
                  onClick={handlePrevPage}
                  disabled={pageNumber <= 1}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover text-text border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  הקודם
                </button>
                <span className="text-text-secondary bg-surface px-4 py-2 rounded-xl border border-border">
                  עמוד {pageNumber} מתוך {numPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover text-text border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  הבא
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}; 