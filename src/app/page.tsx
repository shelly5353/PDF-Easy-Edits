'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for PDFEditor to avoid SSR issues
const PDFEditor = dynamic(() => import('../components/PDFEditor').then(mod => mod.PDFEditor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 bg-gray-800 text-gray-100">
      <div className="text-gray-300">טוען עורך...</div>
    </div>
  )
});

export default function Home() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validatePDF = async (file: File): Promise<boolean> => {
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('הקובץ גדול מדי. הגודל המקסימלי המותר הוא 100MB.');
      return false;
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      setError('אנא בחר קובץ PDF תקין.');
      return false;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Check PDF header
      const header = new TextDecoder().decode(bytes.slice(0, 5));
      if (!header.startsWith('%PDF-')) {
        setError('הקובץ שנבחר אינו קובץ PDF תקין.');
        return false;
      }
      return true;
    } catch (error) {
      setError('שגיאה בקריאת הקובץ. אנא נסה שוב.');
      return false;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const isValid = await validatePDF(file);
      if (!isValid) return;
      
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPdfBytes(bytes);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError('שגיאה בטעינת הקובץ. אנא נסה שוב.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-4xl font-bold mb-4 text-center">עריכת PDF פשוטה</h1>
      <p className="text-xl mb-8 text-center">העלה קובץ PDF להוספת מספור עמודים וכותרות</p>
      <div className="w-full max-w-4xl">
        <PDFEditor />
      </div>
    </div>
  );
} 