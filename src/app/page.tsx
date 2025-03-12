'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for PDFEditor to avoid SSR issues
const PDFEditor = dynamic(() => import('../components/PDFEditor').then(mod => mod.PDFEditor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-gray-600">טוען עורך...</div>
    </div>
  )
});

export default function Home() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">עריכת PDF פשוטה</h1>
      
      {!pdfBytes ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm">
          <p className="text-gray-600 mb-8">העלה קובץ PDF להוספת מספור עמודים וכותרות</p>
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <span>בחר קובץ PDF</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <PDFEditor 
          pdfBytes={pdfBytes}
          initialSettings={null}
          onEditComplete={(settings, editedPdfBytes) => {
            console.log('PDF edited:', editedPdfBytes);
            const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'edited_document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        />
      )}
    </div>
  );
} 