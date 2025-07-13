# PDF2TXT

A powerful Deno library and CLI tool for extracting text and detailed layout information from PDF files using Mozilla PDF.js. Features advanced layout reconstruction that preserves column alignment and table structures.

## Features

- 📄 **Simple Text Extraction**: Extract plain text from PDF files
- 🎯 **Layout Preservation**: Maintain visual layout with proper spacing and column alignment
- 📊 **Table Structure**: Accurately reconstruct table layouts with column headers and data rows
- 🔧 **Customizable**: Configurable options for fine-tuning layout reconstruction
- 🚀 **High Performance**: Built on Mozilla PDF.js for reliable PDF parsing
- 📦 **Dual Usage**: Available as both a library and CLI tool
- 🦕 **Deno Native**: Built specifically for the Deno runtime

## Installation

### As a Library

```typescript
import { extractText, extractLayoutData } from "https://deno.land/x/pdf2txt/src/mod.ts";
```

### As a CLI Tool

```bash
# Install globally
deno install --allow-read --allow-write -n pdf2txt https://deno.land/x/pdf2txt/src/main.ts

# Or run directly
deno run --allow-read --allow-write https://deno.land/x/pdf2txt/src/main.ts --input document.pdf
```

## Library Usage

### Simple Text Extraction

```typescript
import { extractText } from "./src/mod.ts";

// Extract plain text
const text = await extractText("document.pdf");
console.log(text);

// Extract from buffer
const buffer = await Deno.readFile("document.pdf");
const text2 = await extractText(buffer);
```

### Advanced Layout Extraction

```typescript
import { extractLayoutData, extractTextFromPdf } from "./src/mod.ts";

// Extract with layout information
const layoutData = await extractLayoutData("document.pdf");
console.log("Metadata:", layoutData.metadata);
console.log("Reconstructed layout:", layoutData.layoutText);

// Custom options for better table handling
const result = await extractTextFromPdf("document.pdf", {
  includeLayout: true,
  yTolerance: 1.5,              // Tighter row grouping
  characterWidthDivisor: 3.5,   // Different column spacing
  enableDebug: true             // Show debug output
});
```

### Working with Layout Data

```typescript
import { extractLayoutData } from "./src/mod.ts";

const data = await extractLayoutData("table-document.pdf");

// Access metadata
console.log(`Title: ${data.metadata.title}`);
console.log(`Pages: ${data.metadata.pages}`);
console.log(`Author: ${data.metadata.author}`);

// Get reconstructed layout (preserves table structure)
console.log("Layout with preserved columns:");
console.log(data.layoutText);

// Access raw positioning data
data.pageLayouts.forEach(page => {
  console.log(`Page ${page.pageNumber} has ${page.textItems.length} text items`);
  
  // Find table-like content
  const tableItems = page.textItems.filter(item => 
    item.str.match(/^[0-9]+$/) || item.str.includes("$")
  );
  
  tableItems.forEach(item => {
    console.log(`"${item.str}" at position (${item.x}, ${item.y})`);
  });
});
```

## CLI Usage

### Basic Commands

```bash
# Extract text to stdout
pdf2txt --input document.pdf

# Save to file
pdf2txt --input document.pdf --output extracted.txt

# Extract with layout information
pdf2txt --input document.pdf --layout --output layout.txt

# Output as JSON
pdf2txt --input document.pdf --layout --json --output data.json
```

### Advanced Options

```bash
# Custom layout options for better table alignment
pdf2txt --input document.pdf --layout \
  --y-tolerance 1.5 \
  --character-width-divisor 3.5 \
  --debug

# Help and version
pdf2txt --help
pdf2txt --version
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-i, --input <FILE>` | Input PDF file path |
| `-o, --output <FILE>` | Output file path (optional) |
| `-l, --layout` | Include layout and metadata information |
| `-j, --json` | Output in JSON format |
| `-d, --debug` | Enable debug output for layout analysis |
| `--y-tolerance <NUMBER>` | Y-coordinate tolerance for row grouping (default: 2) |
| `--character-width-divisor <NUMBER>` | Character width divisor for column positioning (default: 4.0) |
| `-h, --help` | Show help message |
| `-v, --version` | Show version information |

## API Reference

### Types

```typescript
interface PdfExtractionOptions {
  includeLayout?: boolean;           // Include detailed layout information
  yTolerance?: number;              // Y-coordinate tolerance for grouping (default: 2)
  characterWidthDivisor?: number;   // Character width divisor for positioning (default: 4.0)
  enableDebug?: boolean;            // Enable debug output to console
}

interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modificationDate: string | null;
  pages: number;
}

interface TextItem {
  str: string;        // Text content
  x: number;          // X coordinate
  y: number;          // Y coordinate
  width: number;      // Item width
  height: number;     // Item height
  fontName: string;   // Font name
  // ... additional properties
}

interface PdfLayoutData {
  text: string;                    // Raw extracted text
  layoutText: string;              // Reconstructed layout text
  metadata: PdfMetadata;           // PDF metadata
  pageLayouts: PageLayoutData[];   // Detailed page layouts
  // ... additional properties
}
```

### Functions

```typescript
// Main extraction function with full options
extractTextFromPdf(filePath: string | Uint8Array, options?: PdfExtractionOptions): Promise<string | PdfLayoutData>

// Convenience function for simple text extraction
extractText(filePath: string | Uint8Array): Promise<string>

// Convenience function for layout extraction
extractLayoutData(filePath: string | Uint8Array, options?: Omit<PdfExtractionOptions, 'includeLayout'>): Promise<PdfLayoutData>
```

## Examples

See `examples.ts` for comprehensive usage examples including:

- Basic text extraction
- Layout extraction with default settings
- Custom options for table handling
- Buffer-based extraction
- Debug output for troubleshooting
- Error handling patterns

Run the examples:

```bash
deno run --allow-read examples.ts
```

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd pdf2txt

# Check TypeScript
deno check src/**/*.ts

# Format code
deno fmt

# Lint code
deno lint

# Run tests
deno test --allow-read --allow-write
```

### Build

```bash
# Build CLI executable
deno task build

# The executable will be created at ./bin/pdf2txt
```

### Project Structure

```
pdf2txt/
├── src/
│   ├── lib.ts      # Core library functions
│   ├── main.ts     # CLI interface
│   └── mod.ts      # Library exports
├── tests/          # Test files
├── examples.ts     # Usage examples
├── deno.json       # Deno configuration
└── README.md       # This file
```

### Customization for Different Documents

```typescript
// For documents with tightly packed tables
const result = await extractTextFromPdf("document.pdf", {
  includeLayout: true,
  yTolerance: 1.0,              // Very tight row grouping
  characterWidthDivisor: 2.5    // More precise column spacing
});

// For documents with loose spacing
const result = await extractTextFromPdf("document.pdf", {
  includeLayout: true,
  yTolerance: 3.0,              // Looser row grouping
  characterWidthDivisor: 5.0    // Wider column spacing
});
```

## License

AGPL License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## Changelog

### v1.0.0
- Initial release
- Core text extraction functionality
- Advanced layout reconstruction
- Table structure preservation
- CLI and library interfaces
- Comprehensive documentation and examples
