'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import PDFUploader from '../components/PDFUploader';
import PDFEditor from '../components/PDFEditor';
import PDFPreview from '../components/PDFPreview';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'edit' | 'preview'>('upload');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [editedPdfBytes, setEditedPdfBytes] = useState<Uint8Array | null>(null);
  const [editorSettings, setEditorSettings] = useState<any>(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (file: File) => {
    try {
      console.log('File uploaded:', file.name);
      setFileName(file.name);
      
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      
      // Validate PDF structure
      try {
        // Try to load the PDF to validate it
        await PDFDocument.load(pdfBytes);
        
        // If successful, set the PDF bytes and move to the next step
        setPdfBytes(pdfBytes);
        setCurrentStep('edit');
      } catch (pdfError) {
        console.error('Error validating PDF:', pdfError);
        alert('הקובץ שהועלה אינו קובץ PDF תקין');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('אירעה שגיאה בעת עיבוד הקובץ');
    }
  };

  const handleEditComplete = (settings: any, editedBytes: Uint8Array) => {
    setEditorSettings(settings);
    setEditedPdfBytes(editedBytes);
    setCurrentStep('preview');
  };

  const handleBackToEdit = () => {
    setCurrentStep('edit');
  };

  const handleDownload = () => {
    if (!editedPdfBytes) return;
    
    const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${fileName || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Easy Edits</h1>
          <p className="mt-2 text-lg text-gray-600">הוסף מספור עמודים וכותרות לקבצי PDF בקלות</p>
        </div>
        
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'upload' ? 'bg-primary-100 text-primary-600' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="mr-2">העלאת קובץ</span>
            </div>
            <div className="w-12 h-1 mx-2 bg-gray-200"></div>
            <div className={`flex items-center ${currentStep === 'edit' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'edit' ? 'bg-primary-100 text-primary-600' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="mr-2">עריכה</span>
            </div>
            <div className="w-12 h-1 mx-2 bg-gray-200"></div>
            <div className={`flex items-center ${currentStep === 'preview' ? 'text-primary-600' : 'text-gray-500'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'preview' ? 'bg-primary-100 text-primary-600' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="mr-2">תצוגה מקדימה והורדה</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {currentStep === 'upload' && (
            <div className="p-6">
              <PDFUploader onUpload={handleFileUpload} />
            </div>
          )}
          
          {currentStep === 'edit' && pdfBytes && (
            <div className="p-6">
              <PDFEditor 
                pdfBytes={pdfBytes} 
                initialSettings={editorSettings}
                onEditComplete={handleEditComplete} 
              />
            </div>
          )}
          
          {currentStep === 'preview' && editedPdfBytes && (
            <div className="p-6">
              <PDFPreview 
                pdfBytes={editedPdfBytes} 
                onBack={handleBackToEdit} 
                onDownload={handleDownload} 
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 