'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Tab } from '@headlessui/react';
import fontkit from '@pdf-lib/fontkit';

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
  const [numPages, setNumPages] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [modifiedPdfBytes, setModifiedPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Create preview URL from PDF bytes and get number of pages
  useEffect(() => {
    let url: string | null = null;
    
    const loadPdf = async () => {
      try {
        setError(null);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        setNumPages(pdfDoc.getPageCount());
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError('שגיאה בטעינת ה-PDF. אנא נסה שוב או בחר קובץ אחר.');
      }
    };
    
    loadPdf();
    
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pdfBytes]);

  // Update max page number if needed
  useEffect(() => {
    if (watchedValues.pageNumbering.startPage > numPages) {
      setValue('pageNumbering.startPage', numPages);
    }
  }, [numPages, watchedValues.pageNumbering.startPage, setValue]);
  
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
  
  const handleDownload = () => {
    if (modifiedPdfBytes) {
      onEditComplete(watchedValues, modifiedPdfBytes);
    }
  };

  const handleApplyChanges = async (data: EditorSettings) => {
    setIsPreviewLoading(true);
    try {
      const modifiedPdf = await applyEdits(data);
      if (modifiedPdf) {
        // Cleanup old URL before creating a new one
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        setModifiedPdfBytes(modifiedPdf);
        const blob = new Blob([modifiedPdf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('שגיאה בהחלת השינויים');
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Update preview when form values change
  useEffect(() => {
    const updatePreview = async () => {
      if (!pdfBytes) return;
      
      try {
        setIsPreviewLoading(true);
        const modifiedPdf = await applyEdits(watchedValues);
        if (modifiedPdf) {
          // Cleanup old URL before creating a new one
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          
          setModifiedPdfBytes(modifiedPdf);
          const blob = new Blob([modifiedPdf], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error('Error updating preview:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('שגיאה בעדכון התצוגה המקדימה');
        }
      } finally {
        setIsPreviewLoading(false);
      }
    };
    
    // Use a debounce to avoid too many updates
    const debounceTimer = setTimeout(() => {
      updatePreview();
    }, 500);
    
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [watchedValues, pdfBytes]);

  return (
    <div className="w-full max-h-screen overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {/* Settings form */}
        <div className="overflow-y-auto p-4 bg-white rounded-xl">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">שגיאה: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(handleApplyChanges)} className="space-y-4">
            {/* Page Numbering Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">מספור עמודים</h3>
                <Controller
                  name="pageNumbering.enabled"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...field}
                      />
                      <span className="mr-2 text-sm text-gray-700">הפעל מספור</span>
                    </label>
                  )}
                />
              </div>
              
              {watchedValues.pageNumbering.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        התחל מספור מעמוד
                      </label>
                      <Controller
                        name="pageNumbering.startPage"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={1}
                            max={numPages}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        התחל ממספר
                      </label>
                      <Controller
                        name="pageNumbering.startNumber"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={0}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מיקום המספר
                    </label>
                    <Controller
                      name="pageNumbering.position"
                      control={control}
                      render={({ field }) => (
                        <select
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        פונט
                      </label>
                      <Controller
                        name="pageNumbering.font"
                        control={control}
                        render={({ field }) => (
                          <select
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                          />
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        צבע
                      </label>
                      <Controller
                        name="pageNumbering.color"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="color"
                            className="w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              checked={value}
                              onChange={(e) => onChange(e.target.checked)}
                              {...field}
                            />
                            <span className="mr-2 text-sm text-gray-700">מודגש</span>
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
                <h3 className="text-lg font-medium text-gray-900">כותרת</h3>
                <Controller
                  name="header.enabled"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...field}
                      />
                      <span className="mr-2 text-sm text-gray-700">הפעל כותרת</span>
                    </label>
                  )}
                />
              </div>
              
              {watchedValues.header.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      טקסט הכותרת
                    </label>
                    <Controller
                      name="header.text"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          rows={2}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            checked={value}
                            onChange={(e) => onChange(e.target.checked)}
                            {...field}
                          />
                          <span className="mr-2 text-sm text-gray-700">הצג בעמוד הראשון בלבד</span>
                        </label>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 50)}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 50)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        פונט
                      </label>
                      <Controller
                        name="header.font"
                        control={control}
                        render={({ field }) => (
                          <select
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 14)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        צבע
                      </label>
                      <Controller
                        name="header.color"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="color"
                            className="w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              checked={value}
                              onChange={(e) => onChange(e.target.checked)}
                              {...field}
                            />
                            <span className="mr-2 text-sm text-gray-700">מודגש</span>
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                הורד PDF
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                החל שינויים
              </button>
            </div>
          </form>
        </div>

        {/* PDF Preview */}
        <div className="h-screen bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">תצוגה מקדימה</h3>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              הורד PDF
            </button>
          </div>
          <div className="w-full h-[calc(100vh-8rem)] relative">
            {isPreviewLoading ? (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                className="w-full h-full border-0 rounded-lg shadow-sm"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                אנא טען קובץ PDF
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 