'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Tab } from '@headlessui/react';
import fontkit from '@pdf-lib/fontkit';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFEditorProps {
  pdfBytes: Uint8Array;
  initialSettings: any;
  onEditComplete: (settings: any, editedPdfBytes: Uint8Array) => void;
}

interface EditorSettings {
  pageNumbering: {
    enabled: boolean;
    startPage: number;
    startNumber: number;
    position: string;
    font: string;
    fontSize: number;
    color: string;
    bold: boolean;
  };
  header: {
    enabled: boolean;
    text: string;
    firstPageOnly: boolean;
    distanceFromRight: number;
    distanceFromTop: number;
    font: string;
    fontSize: number;
    color: string;
    bold: boolean;
  };
}

const fontOptions = [
  { value: 'Times-New-Roman', label: 'Times New Roman / טיימס ניו רומן' },
  { value: 'Roboto', label: 'Roboto / רובוטו' },
];

const positionOptions = [
  { value: 'bottom-center', label: 'מרכז תחתון' },
  { value: 'bottom-right', label: 'ימין תחתון' },
  { value: 'bottom-left', label: 'שמאל תחתון' },
  { value: 'top-center', label: 'מרכז עליון' },
  { value: 'top-right', label: 'ימין עליון' },
  { value: 'top-left', label: 'שמאל עליון' },
];

// Helper function to convert hex color to RGB
function hexToRgb(hex: string) {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  return rgb(r, g, b);
}

// Font loading function
async function loadCustomFont(pdfDoc: PDFDocument, fontName: string, bold: boolean = false) {
  pdfDoc.registerFontkit(fontkit);
  
  try {
    let fontPath: string;
    
    switch (fontName) {
      case 'Roboto':
        fontPath = bold ? './fonts/Roboto-Bold.ttf' : './fonts/Roboto-Regular.ttf';
        break;
      case 'Times-New-Roman':
        fontPath = './fonts/times-new-roman.ttf';
        break;
      default:
        console.warn('Font not found, falling back to Times Roman');
        return await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    try {
      const fontResponse = await fetch(fontPath);
      if (!fontResponse.ok) {
        throw new Error(`Failed to load font: ${fontResponse.statusText}`);
      }
      const fontBytes = await fontResponse.arrayBuffer();
      const font = await pdfDoc.embedFont(fontBytes);

      // Test Hebrew support
      const hebrewTest = 'שלום';
      font.encodeText(hebrewTest);
      
      return font;
    } catch (error) {
      console.warn(`Warning: Font ${fontName} failed to load or doesn't support Hebrew, falling back to Times Roman`);
      return await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }
  } catch (error) {
    console.warn('Error in font loading process, falling back to Times Roman:', error);
    return await pdfDoc.embedFont(StandardFonts.TimesRoman);
  }
}

export const PDFEditor: React.FC<PDFEditorProps> = ({
  pdfBytes,
  initialSettings,
  onEditComplete
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [modifiedPdfBytes, setModifiedPdfBytes] = useState<Uint8Array | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const defaultValues = {
    pageNumbering: {
      enabled: true,
      startPage: 1,
      startNumber: 1,
      position: 'bottom-center',
      font: 'Times-New-Roman',
      fontSize: 12,
      color: '#000000',
      bold: false,
    },
    header: {
      enabled: true,
      text: '',
      firstPageOnly: true,
      distanceFromRight: 50,
      distanceFromTop: 50,
      font: 'Times-New-Roman',
      fontSize: 12,
      color: '#000000',
      bold: false,
    },
  };
  
  const { control, handleSubmit, watch, setValue } = useForm<EditorSettings>({
    defaultValues: initialSettings || defaultValues
  });
  
  const watchedValues = watch();
  
  // Watch for form changes
  useEffect(() => {
    setHasChanges(true);
  }, [watchedValues]);
  
  // Cleanup function for URL objects
  const cleanupUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [pdfBytes]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('שגיאה בטעינת הקובץ. אנא נסה שוב.');
    setIsLoading(false);
  };

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (numPages) {
      setPageNumber(prev => Math.min(prev + 1, numPages));
    }
  };

  const applyEdits = async (data: EditorSettings) => {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      if (pages.length === 0) {
        throw new Error('הקובץ ריק - אין עמודים ב-PDF');
      }

      // Add page numbers if enabled
      if (data.pageNumbering.enabled) {
        try {
          const font = await loadCustomFont(pdfDoc, data.pageNumbering.font, data.pageNumbering.bold);
          const color = hexToRgb(data.pageNumbering.color);
          
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            const pageText = `${i + 1}`;
            const fontSize = data.pageNumbering.fontSize;
            const textWidth = font.widthOfTextAtSize(pageText, fontSize);
            
            let x = 0;
            let y = 0;
            
            switch (data.pageNumbering.position) {
              case 'bottom-center':
                x = (width - textWidth) / 2;
                y = 50;
                break;
              case 'bottom-right':
                x = width - textWidth - 50;
                y = 50;
                break;
              case 'bottom-left':
                x = 50;
                y = 50;
                break;
              case 'top-center':
                x = (width - textWidth) / 2;
                y = height - 50;
                break;
              case 'top-right':
                x = width - textWidth - 50;
                y = height - 50;
                break;
              case 'top-left':
                x = 50;
                y = height - 50;
                break;
            }
            
            page.drawText(pageText, {
              x,
              y,
              size: fontSize,
              font,
              color
            });
          }
        } catch (error) {
          console.error('Error adding page numbers:', error);
          throw new Error('שגיאה בהוספת מספרי עמודים. אנא בדוק את ההגדרות ונסה שנית.');
        }
      }

      // Add header if enabled
      if (data.header.enabled && data.header.text.trim()) {
        try {
          const font = await loadCustomFont(pdfDoc, data.header.font, data.header.bold);
          const color = hexToRgb(data.header.color);
          
          const pagesToProcess = data.header.firstPageOnly ? [pages[0]] : pages;
          
          for (const page of pagesToProcess) {
            const { width, height } = page.getSize();
            const fontSize = data.header.fontSize;
            const textWidth = font.widthOfTextAtSize(data.header.text, fontSize);
            
            let x = width - textWidth - data.header.distanceFromRight;
            let y = height - data.header.distanceFromTop;
            
            page.drawText(data.header.text, {
              x,
              y,
              size: fontSize,
              font,
              color
            });
          }
        } catch (error) {
          console.error('Error adding header:', error);
          throw new Error('שגיאה בהוספת הכותרת. אנא בדוק את הטקסט וההגדרות ונסה שנית.');
        }
      }

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error applying edits:', error);
      throw error instanceof Error ? error : new Error('שגיאה כללית בעריכת ה-PDF. אנא נסה שנית.');
    }
  };
  
  const handleApplyChanges = async (data: EditorSettings) => {
    if (!pdfBytes || !hasChanges) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const modifiedPdf = await applyEdits(data);
      if (modifiedPdf) {
        setModifiedPdfBytes(modifiedPdf);
        setHasChanges(false);
        setPageNumber(1); // Reset to first page after changes
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בהחלת השינויים');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (modifiedPdfBytes) {
      onEditComplete(watchedValues, modifiedPdfBytes);
    } else if (pdfBytes && hasChanges) {
      // If there are changes but preview wasn't updated, apply changes before download
      handleApplyChanges(watchedValues);
    }
  };

  return (
    <div className="w-full max-h-screen overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {/* Settings form */}
        <div className="overflow-y-auto p-4 bg-gray-900 rounded-xl">
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">שגיאה: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(handleApplyChanges)} className="space-y-4">
            {/* Page Numbering Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-100">מספור עמודים</h3>
                <Controller
                  name="pageNumbering.enabled"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...field}
                      />
                      <span className="mr-2 text-sm text-gray-300">הפעל מספור</span>
                    </label>
                  )}
                />
              </div>
              
              {watchedValues.pageNumbering.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        התחל מספור מעמוד
                      </label>
                      <Controller
                        name="pageNumbering.startPage"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={1}
                            max={numPages || 1}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        התחל ממספר
                      </label>
                      <Controller
                        name="pageNumbering.startNumber"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={0}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      מיקום המספר
                    </label>
                    <Controller
                      name="pageNumbering.position"
                      control={control}
                      render={({ field }) => (
                        <select
                          className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                          {...field}
                        >
                          {positionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        פונט
                      </label>
                      <Controller
                        name="pageNumbering.font"
                        control={control}
                        render={({ field }) => (
                          <select
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                          >
                            {fontOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        גודל פונט
                      </label>
                      <Controller
                        name="pageNumbering.fontSize"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={8}
                            max={24}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                          />
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        צבע
                      </label>
                      <Controller
                        name="pageNumbering.color"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="color"
                            className="w-full h-8 rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                            {...field}
                          />
                        )}
                      />
                    </div>
                    <div className="flex items-end">
                      <Controller
                        name="pageNumbering.bold"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                              checked={value}
                              onChange={(e) => onChange(e.target.checked)}
                              {...field}
                            />
                            <span className="mr-2 text-sm text-gray-300">מודגש</span>
                          </label>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Header Section */}
            <div className="space-y-3 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-100">כותרת</h3>
                <Controller
                  name="header.enabled"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...field}
                      />
                      <span className="mr-2 text-sm text-gray-300">הפעל כותרת</span>
                    </label>
                  )}
                />
              </div>
              
              {watchedValues.header.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      טקסט הכותרת
                    </label>
                    <Controller
                      name="header.text"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          rows={2}
                          className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                          placeholder="הזן את טקסט הכותרת כאן..."
                          {...field}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Controller
                      name="header.firstPageOnly"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                            checked={value}
                            onChange={(e) => onChange(e.target.checked)}
                            {...field}
                          />
                          <span className="mr-2 text-sm text-gray-300">הצג בעמוד הראשון בלבד</span>
                        </label>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        מרחק מימין (ס"מ)
                      </label>
                      <Controller
                        name="header.distanceFromRight"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 50)}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        מרחק מלמעלה (ס"מ)
                      </label>
                      <Controller
                        name="header.distanceFromTop"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 50)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        פונט
                      </label>
                      <Controller
                        name="header.font"
                        control={control}
                        render={({ field }) => (
                          <select
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                          >
                            {fontOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        גודל פונט
                      </label>
                      <Controller
                        name="header.fontSize"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={8}
                            max={36}
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800 text-gray-100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 14)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        צבע
                      </label>
                      <Controller
                        name="header.color"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="color"
                            className="w-full h-8 rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                            {...field}
                          />
                        )}
                      />
                    </div>
                    <div className="flex items-end">
                      <Controller
                        name="header.bold"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-800"
                              checked={value}
                              onChange={(e) => onChange(e.target.checked)}
                              {...field}
                            />
                            <span className="mr-2 text-sm text-gray-300">מודגש</span>
                          </label>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!pdfBytes}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !pdfBytes 
                    ? 'bg-gray-600 cursor-not-allowed text-gray-300' 
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
                }`}
              >
                הורד PDF
              </button>
              <button
                type="submit"
                disabled={!hasChanges || !pdfBytes}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !hasChanges || !pdfBytes
                    ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
                }`}
              >
                החל שינויים
              </button>
            </div>
          </form>
        </div>

        {/* PDF Preview */}
        <div className="h-screen bg-gray-900 rounded-xl p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-100">תצוגה מקדימה</h3>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            >
              הורד PDF
            </button>
          </div>
          <div className="w-full h-[calc(100vh-8rem)] relative">
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {pdfBytes && (
              <div className="w-full h-full overflow-auto bg-gray-800 rounded-lg p-4">
                <Document
                  file={modifiedPdfBytes || pdfBytes}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    width={Math.min(window.innerWidth * 0.4, 800)}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
                {numPages && numPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                      onClick={handlePrevPage}
                      disabled={pageNumber <= 1}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md disabled:bg-gray-600"
                    >
                      הקודם
                    </button>
                    <span className="text-gray-200">
                      עמוד {pageNumber} מתוך {numPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={pageNumber >= numPages}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md disabled:bg-gray-600"
                    >
                      הבא
                    </button>
                  </div>
                )}
              </div>
            )}
            {!pdfBytes && (
              <div className="flex items-center justify-center h-full text-gray-400">
                אנא טען קובץ PDF
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 