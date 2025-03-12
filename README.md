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

- הוספת מספרי עמודים עם שליטה מלאה על המיקום, הפונט והעיצוב
- הוספת כותרות בעברית ובאנגלית עם תמיכה מלאה בכיווניות RTL/LTR
- תצוגה מקדימה של התוצאה בזמן אמת
- ממשק משתמש ידידותי בעברית
- עיבוד מקומי של הקבצים (הקבצים לא נשלחים לשרת)

## טכנולוגיות

- Next.js 13
- React 18
- TypeScript
- Tailwind CSS
- pdf-lib לעריכת קבצי PDF
- Headless UI לממשק המשתמש

## מבנה הפרויקט

```
.
├── public/
│   └── fonts/              # קבצי פונט
├── src/
│   ├── app/               # קומפוננטות דפים
│   ├── components/        # קומפוננטות משותפות
│   ├── lib/              # פונקציות עזר
│   └── styles/           # קבצי CSS
├── .babelrc              # קונפיגורציית Babel
├── next.config.js        # קונפיגורציית Next.js
├── package.json          # תלויות הפרויקט
├── postcss.config.js     # קונפיגורציית PostCSS
├── tailwind.config.ts    # קונפיגורציית Tailwind
└── tsconfig.json         # קונפיגורציית TypeScript
```

## התקנה

1. התקן את תלויות הפרויקט:
```bash
npm install
```

2. הרץ את הפרויקט במצב פיתוח:
```bash
npm run dev
```

3. פתח את http://localhost:3000 בדפדפן.

## בנייה לייצור

כדי לבנות את האפליקציה לייצור:

```bash
npm run build
npm start
```

## רישיון

כל הזכויות שמורות © 2024 