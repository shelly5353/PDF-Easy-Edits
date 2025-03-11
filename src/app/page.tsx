'use client';

import { PDFEasyEdits } from 'pdf-easy-edits';
import 'pdf-easy-edits/dist/styles/pdf-easy-edits.css';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">PDF Easy Edits</h1>
        <PDFEasyEdits 
          containerClassName="w-full min-h-screen bg-white rounded-lg shadow-lg p-6" 
          onEditComplete={(editedPdfBytes) => {
            console.log('PDF edited:', editedPdfBytes);
          }}
        />
      </div>
    </main>
  );
} 