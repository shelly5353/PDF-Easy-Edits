import React, { useState } from 'react';
import { PDFEditor } from './PDFEditor';

export interface PDFEasyEditsProps {
  containerClassName?: string;
  onEditComplete?: (editedPdfBytes: Uint8Array) => void;
}

export const PDFEasyEdits: React.FC<PDFEasyEditsProps> = ({ 
  containerClassName = "w-full min-h-screen bg-gray-50 p-4", 
  onEditComplete 
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
  };

  const handleEditComplete = (settings: any, editedPdfBytes: Uint8Array) => {
    // Call parent callback if provided
    if (onEditComplete) {
      onEditComplete(editedPdfBytes);
    }
    
    // Create download link
    const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${fileName || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={containerClassName}>
      {!pdfBytes ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">PDF Easy Edits</h2>
          <p className="text-gray-600 mb-8">העלה קובץ PDF להוספת מספור עמודים וכותרות</p>
          <label className="cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
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
          onEditComplete={handleEditComplete}
        />
      )}
    </div>
  );
}; 