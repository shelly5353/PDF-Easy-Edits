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
  pdfBytes?: Uint8Array;
  initialSettings?: any;
  onEditComplete?: (settings: any, editedPdfBytes: Uint8Array) => void;
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
  pdfBytes: initialPdfBytes,
  initialSettings,
  onEditComplete
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(initialPdfBytes || null);
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
    if (!pdfBytes) {
      throw new Error('לא נבחר קובץ PDF');
    }

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
    if (!pdfBytes) {
      setError('לא נבחר קובץ PDF');
      return;
    }
    
    if (!hasChanges) return;
    
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
    if (!pdfBytes) {
      setError('לא נבחר קובץ PDF');
      return;
    }

    if (modifiedPdfBytes) {
      if (onEditComplete) {
        onEditComplete(watchedValues, modifiedPdfBytes);
      } else {
        // If no onEditComplete provided, download directly
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited_document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else if (hasChanges) {
      // If there are changes but preview wasn't updated, apply changes before download
      handleApplyChanges(watchedValues);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('אנא בחר קובץ PDF בלבד');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setPdfBytes(bytes);
      setModifiedPdfBytes(null);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת הקובץ. אנא נסה שוב.');
    }
  };

  if (!pdfBytes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-gray-950 to-gray-900">
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 backdrop-blur-sm border border-red-800/50 text-red-100 rounded-xl shadow-xl">
            {error}
          </div>
        )}
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
          <label className="relative px-8 py-4 bg-gray-900 ring-1 ring-gray-800/50 rounded-xl flex items-center gap-3 hover:bg-gray-900/80 transition duration-200">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span className="text-lg font-medium text-gray-100">בחר קובץ PDF</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl ring-1 ring-gray-800/50 shadow-xl">
            {error && (
              <div className="mb-6 p-4 bg-red-950/50 backdrop-blur-sm border border-red-800/50 text-red-100 rounded-xl">
                <strong className="font-medium">שגיאה: </strong>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit(handleApplyChanges)} className="space-y-6">
              {/* Page Numbering Section */}
              <div className="space-y-4 bg-gray-950/50 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                  <h3 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                    </svg>
                    מספור עמודים
                  </h3>
                  <Controller
                    name="pageNumbering.enabled"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full h-8 rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
                                className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
              <div className="space-y-4 bg-gray-950/50 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                  <h3 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/>
                    </svg>
                    כותרת
                  </h3>
                  <Controller
                    name="header.enabled"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
                            className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900 text-gray-100"
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
                              className="w-full h-8 rounded-md border-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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
                                className="rounded border-gray-700 text-blue-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 bg-gray-900"
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

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!pdfBytes}
                  className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 ${
                    !pdfBytes 
                      ? 'bg-gray-800 cursor-not-allowed text-gray-400' 
                      : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg hover:shadow-green-500/25'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  הורד PDF
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges || !pdfBytes}
                  className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 ${
                    !hasChanges || !pdfBytes
                      ? 'bg-gray-800 cursor-not-allowed text-gray-400'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  החל שינויים
                </button>
              </div>
            </form>
          </div>

          {/* PDF Preview Panel */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl ring-1 ring-gray-800/50 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800/50 pb-3">
              <h3 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                תצוגה מקדימה
              </h3>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-sm rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                הורד PDF
              </button>
            </div>
            <div className="relative h-[calc(100vh-12rem)] bg-gray-950/50 rounded-xl p-4 ring-1 ring-gray-800/50">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-400">טוען...</span>
                  </div>
                </div>
              )}
              {pdfBytes && (
                <div className="w-full h-full flex flex-col items-center bg-gray-950/50 rounded-xl overflow-hidden">
                  <Document
                    file={new Blob([modifiedPdfBytes || pdfBytes])}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
                          <span className="text-sm text-gray-400">טוען מסמך...</span>
                        </div>
                      </div>
                    }
                  >
                    <div className="bg-gray-950/50 rounded-xl flex justify-center p-4">
                      <Page
                        pageNumber={pageNumber}
                        width={Math.min(window.innerWidth * 0.4, 800)}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-2xl rounded-lg"
                      />
                    </div>
                  </Document>
                  {numPages && numPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-4 w-full bg-gray-950/30 p-3 rounded-xl">
                      <button
                        onClick={handlePrevPage}
                        disabled={pageNumber <= 1}
                        className="px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-xl disabled:bg-gray-800 disabled:text-gray-600 transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        הקודם
                      </button>
                      <span className="text-gray-300 bg-gray-900/50 px-4 py-2 rounded-lg">
                        עמוד {pageNumber} מתוך {numPages}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={pageNumber >= numPages}
                        className="px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-xl disabled:bg-gray-800 disabled:text-gray-600 transition-all duration-200 flex items-center gap-2"
                      >
                        הבא
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!pdfBytes && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>אנא טען קובץ PDF</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor; 