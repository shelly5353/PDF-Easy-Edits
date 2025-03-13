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
      <div className="text-center mb-16 relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-400 text-transparent bg-clip-text relative">
          עריכת PDF פשוטה
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          הוספת מספור עמודים וכותרות לקבצי PDF בקלות ובמהירות, ללא צורך בהתקנת תוכנות
        </p>
      </div>
      
      <div className="w-full max-w-6xl mx-auto relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-5 blur-3xl"></div>
        <div className="card p-8 backdrop-blur-sm bg-white/80">
          <PDFEditor />
        </div>
      </div>
    </div>
  );
} 