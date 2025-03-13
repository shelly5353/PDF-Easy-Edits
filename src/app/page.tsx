'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for PDFEditor to avoid SSR issues
const PDFEditor = dynamic(() => import('../components/PDFEditor').then(mod => mod.PDFEditor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="loading-spinner"></div>
      <span className="text-text-secondary mr-3">טוען עורך...</span>
    </div>
  )
});

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">
          עריכת PDF פשוטה
        </h1>
        <p className="text-xl text-text-secondary">
          הוספת מספור עמודים וכותרות לקבצי PDF בקלות ובמהירות
        </p>
      </div>
      
      <div className="w-full max-w-6xl mx-auto">
        <div className="card p-6">
          <PDFEditor />
        </div>
      </div>
    </div>
  );
} 