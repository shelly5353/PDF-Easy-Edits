import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Easy Edits - עריכת PDF קלה',
  description: 'הוספת מספרי עמודים וכותרות לקבצי PDF בקלות',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ backgroundColor: '#030712' }} className="font-sans">
        <main className="min-h-screen" style={{ backgroundColor: '#030712' }}>
          {children}
        </main>
      </body>
    </html>
  );
} 