'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { PDFDocument } from 'pdf-lib';

interface PDFUploaderProps {
  onUpload: (file: File) => void;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const file = files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        setError('יש להעלות קובץ PDF בלבד');
        setIsLoading(false);
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('גודל הקובץ חייב להיות קטן מ-10MB');
        setIsLoading(false);
        return;
      }
      
      // Validate PDF structure
      try {
        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Try to load the PDF to validate it
        await PDFDocument.load(new Uint8Array(arrayBuffer));
        
        // If successful, call the onUpload callback
        onUpload(file);
      } catch (pdfError) {
        console.error('Error validating PDF:', pdfError);
        setError('הקובץ שהועלה אינו קובץ PDF תקין');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('אירעה שגיאה בעת עיבוד הקובץ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
      } transition-colors duration-200 ease-in-out`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf"
        className="hidden"
      />
      
      <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
      
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        גרור ושחרר קובץ PDF, או
      </h3>
      
      <div className="mt-4">
        <button
          type="button"
          onClick={handleButtonClick}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          disabled={isLoading}
        >
          {isLoading ? 'מעבד...' : 'בחר קובץ'}
        </button>
      </div>
      
      <p className="mt-2 text-xs text-gray-500">
        PDF עד 10MB
      </p>
      
      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}; 