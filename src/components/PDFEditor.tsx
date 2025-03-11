'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Tab } from '@headlessui/react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import fontkit from '@pdf-lib/fontkit';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  { value: 'Times-New-Roman', label: 'Times New Roman' },
];

const positionOptions = [
  { value: 'bottom-center', label: 'מרכז תחתון' },
  { value: 'bottom-right', label: 'ימין תחתון' },
  { value: 'bottom-left', label: 'שמאל תחתון' },
  { value: 'top-center', label: 'מרכז עליון' },
  { value: 'top-right', label: 'ימין עליון' },
  { value: 'top-left', label: 'שמאל עליון' },
];

export const PDFEditor: React.FC<PDFEditorProps> = ({
  pdfBytes,
  initialSettings,
  onEditComplete
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
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
  
  // Create preview URL from PDF bytes
  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfBytes]);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    
    // Update max page number if needed
    if (watchedValues.pageNumbering.startPage > numPages) {
      setValue('pageNumbering.startPage', numPages);
    }
  };
  
  const applyEdits = async (data: EditorSettings) => {
    try {
      console.log('Starting PDF edit process with data:', data);
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Register fontkit for custom font support
      pdfDoc.registerFontkit(fontkit);
      
      // Try to load Times New Roman font, fallback to Helvetica if fails
      let font;
      try {
        // First try to load from our public directory
        const fontBytes = await fetch('/fonts/times-new-roman.ttf').then(res => res.arrayBuffer());
        font = await pdfDoc.embedFont(fontBytes);
        console.log('Successfully loaded Times New Roman font');
      } catch (fontError) {
        console.error('Failed to load Times New Roman font, falling back to Helvetica:', fontError);
        // Fallback to Helvetica
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Get the pages
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Process page numbering
      if (data.pageNumbering.startPage > 0) {
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
          const textWidth = font.widthOfTextAtSize(pageNumberText, data.pageNumbering.fontSize);
          
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
            font,
            color: rgbColor,
          });
          
          // Increment the page number
          currentNumber++;
        }
      }
      
      // Process header
      if (data.header.text && data.header.text.trim()) {
        try {
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
            
            // Split the header text into lines and handle RTL
            const lines = data.header.text.trim().split('\n');
            
            // Calculate the starting Y position
            let y = height - marginTop;
            
            // Process each line
            for (const line of lines) {
              if (!line.trim()) continue;
              
              // Check if the line contains Hebrew
              const containsHebrew = /[\u0590-\u05FF]/.test(line);
              
              // Calculate text width for positioning
              const textWidth = font.widthOfTextAtSize(line, data.header.fontSize);
              
              // Calculate X position (right-aligned for Hebrew, left-aligned for English)
              let x;
              if (containsHebrew) {
                x = width - marginRight - textWidth;
              } else {
                x = marginRight;
              }
              
              // Draw the text
              page.drawText(line, {
                x: Math.max(0, x),
                y,
                size: data.header.fontSize,
                font,
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
      
      // Call the callback with the modified PDF
      onEditComplete(data, modifiedPdfBytes);
      
    } catch (error) {
      console.error('Error applying edits:', error);
      alert(error instanceof Error ? error.message : 'אירעה שגיאה בעריכת ה-PDF. אנא נסה שנית או בחר קובץ אחר.');
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="order-2 md:order-1">
        <div className="space-y-6">
          {/* Page Numbering Section */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">מספור עמודים</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
            </form>
          </div>
          
          {/* Header Section */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">כותרת</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  טקסט הכותרת
                </label>
                <Controller
                  name="header.text"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      rows={3}
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
              
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
            </form>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit(applyEdits)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            החל שינויים והמשך
          </button>
        </div>
      </div>
      
      <div className="order-1 md:order-2 bg-gray-100 rounded-lg p-4 h-[600px] overflow-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">תצוגה מקדימה</h3>
        <div className="pdf-container">
          <Document
            file={previewUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="text-center py-10">טוען מסמך...</div>}
            error={<div className="text-center py-10 text-red-500">שגיאה בטעינת המסמך</div>}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page 
                key={`page_${index + 1}`} 
                pageNumber={index + 1} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={1}
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  return { r, g, b };
} 