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
      <body className="font-sans">
        <main>
          {children}
        </main>
      </body>
    </html>
  );
} 