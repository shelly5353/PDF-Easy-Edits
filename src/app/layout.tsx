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
    <html lang="he" dir="rtl" className="bg-gray-950">
      <body className="font-sans bg-gray-950">
        <main className="bg-gray-950">
          {children}
        </main>
      </body>
    </html>
  );
} 