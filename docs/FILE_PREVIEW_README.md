# File Preview Modal System

## Overview

The File Preview Modal system provides a comprehensive way to preview uploaded files (CSV/Excel) with schema inference, data visualization, and quick actions. The system is designed to be fast, accessible, and safe.

## Features

### 🎯 Core Functionality
- **Modal Preview**: Centered modal with large viewport for file inspection
- **Schema Inference**: Automatic type detection (string/number/boolean/date) with statistics
- **Data Table**: Virtualized table showing first 100 rows with search functionality
- **Quick Actions**: Download, Analyze in Chat, Delete with confirmation

### 🔧 Technical Implementation
- **Web Worker**: File parsing happens in a background thread to keep UI responsive
- **Type Inference**: Deterministic rules for column type detection
- **Performance**: LRU cache for parsed results, 10MB file size limit
- **Accessibility**: Full keyboard navigation, screen reader support, focus management

## File Structure

```
src/
├── components/
│   ├── files/
│   │   ├── FilePreviewModal.tsx    # Main preview modal
│   │   ├── FileCard.tsx            # File card with preview action
│   │   ├── FileActionBar.tsx       # Action buttons (Preview, Download, Delete)
│   │   └── RecentFiles.tsx         # Recent files grid with preview integration
│   └── ui/
│       ├── Badge.tsx               # Type badges for schema
│       └── Input.tsx               # Search input component
├── hooks/
│   └── useFilePreview.ts           # Preview state management
├── workers/
│   └── fileParser.worker.ts        # Web Worker for file parsing
└── app/api/uploads/[id]/content/
    └── route.ts                    # API endpoint for file content
```

## Usage

### Basic Integration

```tsx
import { RecentFiles } from '@/components/files/RecentFiles';

function Dashboard() {
  const handleAnalyze = (fileName: string) => {
    // Prefill chat with analysis prompt
    setChatInput(`Use ${fileName}. Show basic stats per column and any anomalies.`);
  };

  return (
    <div>
      <RecentFiles onAnalyze={handleAnalyze} />
    </div>
  );
}
```

### Keyboard Shortcuts

- **Enter**: Open preview when file card is focused
- **Escape**: Close preview modal
- **⌘/Ctrl+P**: Quick preview of most recent file

### File Card Actions

Each file card includes three action buttons:
- **👁️ Preview**: Opens the preview modal
- **⬇️ Download**: Downloads the original file
- **🗑️ Delete**: Deletes with confirmation and undo

## Schema Inference

### Type Detection Rules

1. **Number**: Matches pattern `/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/`
2. **Boolean**: Case-insensitive match for `true/false/yes/no/1/0`
3. **Date**: ISO format or common locale formats
4. **String**: Fallback for mixed or unrecognized types

### Statistics Calculated

- **Null Count**: Number of empty/null values
- **Unique Count**: Approximate distinct values
- **Min/Max/Mean**: For numeric columns
- **Sample Values**: First 10 non-null values for context

## Performance & Limits

### File Size Limits
- **Preview Limit**: 10MB maximum
- **Row Limit**: First 100 rows displayed
- **Cache**: LRU cache for last 10 parsed files

### Error Handling
- **Large Files**: Shows "Too large for preview" message
- **Malformed Data**: Displays warning banner with details
- **Worker Crashes**: Retry mechanism with error reporting

## API Endpoints

### GET `/api/uploads/[id]/content`
Returns the raw file content for parsing.

**Response**: Plain text content of the file

**Error Cases**:
- 401: Unauthorized
- 404: File not found
- 500: Download error

## Accessibility Features

### Keyboard Navigation
- Tab navigation through all interactive elements
- Enter to open preview
- Escape to close modal
- Arrow keys for table navigation

### Screen Reader Support
- Proper ARIA labels and roles
- Table headers with `scope="col"`
- Modal with `role="dialog"` and `aria-modal="true"`

### Focus Management
- Focus trap within modal
- Restore focus to originating card on close
- Visible focus indicators

## Troubleshooting

### Common Issues

1. **Preview Not Loading**
   - Check file size (must be < 10MB)
   - Verify file format (CSV/Excel supported)
   - Check browser console for worker errors

2. **Slow Performance**
   - Large files may take time to parse
   - Check if Web Worker is supported
   - Clear browser cache if needed

3. **Type Inference Issues**
   - Mixed data types fall back to string
   - Check data quality in source file
   - Manual type correction may be needed

### Debug Information

Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug', 'file-preview');
```

## Future Enhancements

- [ ] Excel file parsing with xlsx library
- [ ] JSON file support
- [ ] Column type editing
- [ ] Data export from preview
- [ ] Advanced filtering options
- [ ] Chart generation from preview data

## Security Considerations

- File content is only accessible to authenticated users
- No file content is logged or stored in browser
- Worker runs in isolated context
- Signed URLs for secure file access

