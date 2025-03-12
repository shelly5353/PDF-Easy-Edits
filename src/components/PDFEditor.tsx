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
    startPage: number;
    startNumber: number;
    position: string;
    font: string;
    fontSize: number;
    color: string;
    isBold: boolean;
  };
  header: {
    text: string;
    firstPageOnly: boolean;
    position: { x: number; y: number };
    font: string;
    fontSize: number;
    color: string;
    isBold: boolean;
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
  
  return { r, g, b };
}

// Font loading function
async function loadCustomFont(pdfDoc: PDFDocument, fontName: string, isBold: boolean = false) {
  pdfDoc.registerFontkit(fontkit);
  
  try {
    let fontPath: string;
    
    switch (fontName) {
      case 'Roboto':
        fontPath = isBold ? '/fonts/Roboto-Bold.ttf' : '/fonts/Roboto-Regular.ttf';
        break;
      case 'Times-New-Roman':
        fontPath = '/fonts/times-new-roman.ttf';
        break;
      default:
        throw new Error('Font not found');
    }

    const fontResponse = await fetch(fontPath);
    const fontBytes = await fontResponse.arrayBuffer();
    const font = await pdfDoc.embedFont(fontBytes);

    // Test Hebrew support
    try {
      const hebrewTest = 'שלום';
      font.encodeText(hebrewTest);
    } catch (error) {
      console.warn(`Warning: Font ${fontName} might not support Hebrew text properly`);
    }

    return font;
  } catch (error) {
    console.error('Error loading font:', error);
    // Fallback to standard font if custom font fails
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
  
  const defaultValues = {
    pageNumbering: {
      startPage: 1,
      startNumber: 1,
      position: 'bottom-center',
      font: 'Times-New-Roman',
      fontSize: 12,
      color: '#000000',
      isBold: false,
    },
    header: {
      text: '',
      firstPageOnly: true,
      position: { x: 2.5, y: 2.5 },
      font: 'Times-New-Roman',
      fontSize: 12,
      color: '#000000',
      isBold: false,
    },
  };
  
  const { control, handleSubmit, watch, setValue } = useForm<EditorSettings>({
    defaultValues: initialSettings || defaultValues
  });
  
  const watchedValues = watch();
  
  // Create preview URL from PDF bytes and get number of pages
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        setNumPages(pdfDoc.getPageCount());
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    
    loadPdf();
  }, [pdfBytes]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);
  
  // Update max page number if needed
  useEffect(() => {
    if (watchedValues.pageNumbering.startPage > numPages) {
      setValue('pageNumbering.startPage', numPages);
    }
  }, [numPages, watchedValues.pageNumbering.startPage, setValue]);
  
  const applyEdits = async (data: EditorSettings) => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the pages
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Process page numbering
      if (data.pageNumbering.startPage > 0) {
        // Load font for page numbers
        const pageNumberFont = await loadCustomFont(pdfDoc, data.pageNumbering.font, data.pageNumbering.isBold);
        
        // Calculate the starting page index (0-based)
        const startPageIndex = Math.min(data.pageNumbering.startPage - 1, pages.length - 1);
        let currentNumber = data.pageNumbering.startNumber;
        
        // Parse the color
        const color = hexToRgb(data.pageNumbering.color);
        const rgbColor = rgb(color.r, color.g, color.b);
        
        // Add page numbers to each page starting from the specified page
        for (let i = startPageIndex; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          
          // Convert the page number to string
          const pageNumberText = currentNumber.toString();
          
          // Calculate the width of the text
          const textWidth = pageNumberFont.widthOfTextAtSize(pageNumberText, data.pageNumbering.fontSize);
          
          // Calculate the position based on the selected position
          let x = 0;
          let y = 0;
          
          // Horizontal position
          if (data.pageNumbering.position.includes('center')) {
            x = (width - textWidth) / 2;
          } else if (data.pageNumbering.position.includes('right')) {
            x = width - textWidth - 30;
          } else if (data.pageNumbering.position.includes('left')) {
            x = 30;
          }
          
          // Vertical position
          if (data.pageNumbering.position.includes('bottom')) {
            y = 30;
          } else if (data.pageNumbering.position.includes('top')) {
            y = height - 30;
          }
          
          // Draw the page number
          page.drawText(pageNumberText, {
            x,
            y,
            size: data.pageNumbering.fontSize,
            font: pageNumberFont,
            color: rgbColor,
          });
          
          // Increment the page number
          currentNumber++;
        }
      }
      
      // Process header
      if (data.header.text && data.header.text.trim()) {
        try {
          // Load font for header
          const headerFont = await loadCustomFont(pdfDoc, data.header.font, data.header.isBold);
          
          // Parse the color
          const color = hexToRgb(data.header.color);
          const rgbColor = rgb(color.r, color.g, color.b);
          
          // Convert cm to points (1cm ≈ 28.35 points)
          const marginRight = data.header.position.x * 28.35;
          const marginTop = data.header.position.y * 28.35;
          
          // Determine which pages to add the header to
          const pagesToProcess = data.header.firstPageOnly ? [pages[0]] : pages;
          
          // Process each page
          for (const page of pagesToProcess) {
            const { width, height } = page.getSize();
            
            // Split the header text into lines
            const lines = data.header.text.trim().split('\n');
            
            // Calculate the starting Y position
            let y = height - marginTop;
            
            // Process each line
            for (const line of lines) {
              if (!line.trim()) continue;
              
              // Check if the line contains Hebrew
              const containsHebrew = /[\u0590-\u05FF]/.test(line);
              const textWidth = headerFont.widthOfTextAtSize(line, data.header.fontSize);
              
              // Calculate X position (right-aligned for Hebrew, left-aligned for English)
              let x = containsHebrew ? 
                width - marginRight - textWidth : 
                marginRight;
              
              // Draw the text
              page.drawText(line, {
                x: Math.max(0, x),
                y,
                size: data.header.fontSize,
                font: headerFont,
                color: rgbColor,
              });
              
              // Move down for the next line
              y -= data.header.fontSize * 1.5;
            }
          }
        } catch (headerError) {
          console.error('Error processing header:', headerError);
          throw new Error('שגיאה בהוספת הכותרת. אנא ודא שהטקסט תקין ונסה שנית.');
        }
      }
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      return modifiedPdfBytes;
      
    } catch (error) {
      console.error('Error applying edits:', error);
      alert(error instanceof Error ? error.message : 'אירעה שגיאה בעריכת ה-PDF. אנא נסה שנית או בחר קובץ אחר.');
      return null;
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
      console.error('Error updating preview:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="w-full max-h-screen overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {/* Settings form */}
        <div className="overflow-y-auto p-4 bg-white rounded-xl">
          <form onSubmit={handleSubmit(handleApplyChanges)} className="space-y-4">
            {/* Page Numbering Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">מספור עמודים</h3>
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
                    name="pageNumbering.isBold"
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
            </div>

            {/* Header Section */}
            <div className="space-y-3 mt-6">
              <h3 className="text-lg font-medium text-gray-900">כותרת</h3>
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
                    name="header.position.x"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מרחק מלמעלה (ס"מ)
                  </label>
                  <Controller
                    name="header.position.y"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
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
                    name="header.isBold"
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
            {isPreviewLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="w-full h-full border-0 rounded-lg shadow-sm"
              title="PDF Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 