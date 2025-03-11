# PDF Easy Edits

A React component for easy PDF editing with support for Hebrew and English text.

## Installation

```bash
npm install pdf-easy-edits
```

## Usage

```jsx
import { PDFEasyEdits } from 'pdf-easy-edits';
import 'pdf-easy-edits/dist/styles/pdf-easy-edits.css';

function App() {
  const handleEditComplete = (editedPdfBytes) => {
    // Handle the edited PDF bytes
    console.log('PDF edited:', editedPdfBytes);
  };

  return (
    <PDFEasyEdits 
      containerClassName="w-full h-screen" 
      onEditComplete={handleEditComplete}
    />
  );
}
```

## Features

- Upload and edit PDF files
- Add headers in Hebrew and English
- Add page numbers
- Automatic text direction (RTL for Hebrew, LTR for English)
- Download edited PDFs

## Props

| Prop | Type | Description |
|------|------|-------------|
| containerClassName | string | Optional CSS class for the container |
| onEditComplete | (pdfBytes: Uint8Array) => void | Callback when PDF editing is complete |

---

# PDF Easy Edits - עברית

רכיב React לעריכת PDF קלה עם תמיכה בטקסט בעברית ובאנגלית.

## התקנה

```bash
npm install pdf-easy-edits
```

## שימוש

```jsx
import { PDFEasyEdits } from 'pdf-easy-edits';
import 'pdf-easy-edits/dist/styles/pdf-easy-edits.css';

function App() {
  const handleEditComplete = (editedPdfBytes) => {
    // טיפול בקובץ ה-PDF הערוך
    console.log('PDF edited:', editedPdfBytes);
  };

  return (
    <PDFEasyEdits 
      containerClassName="w-full h-screen" 
      onEditComplete={handleEditComplete}
    />
  );
}
```

## תכונות

- העלאה ועריכה של קבצי PDF
- הוספת כותרות בעברית ובאנגלית
- הוספת מספרי עמודים
- כיוון טקסט אוטומטי (RTL לעברית, LTR לאנגלית)
- הורדת קבצי PDF ערוכים

## מאפיינים

| מאפיין | סוג | תיאור |
|--------|-----|--------|
| containerClassName | string | מחלקת CSS אופציונלית למיכל |
| onEditComplete | (pdfBytes: Uint8Array) => void | פונקציית callback בסיום עריכת ה-PDF | 