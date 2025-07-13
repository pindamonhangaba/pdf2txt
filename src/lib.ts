/**
 * PDF2TXT Library - Extract text and layout information from PDF files
 *
 * This library provides functionality to extract text content from PDF files
 * with optional layout preservation and detailed positioning information.
 */

import * as pdfjsLib from "pdfjs-dist";

// ============================================================================
// Public Types
// ============================================================================

/** Configuration options for PDF text extraction */
export interface PdfExtractionOptions {
  /** Whether to include detailed layout information */
  includeLayout?: boolean;
  /** Custom Y-coordinate tolerance for grouping text items (default: 2) */
  yTolerance?: number;
  /** Custom character width divisor for X-positioning (default: 4.0) */
  characterWidthDivisor?: number;
  /** Whether to enable debug output to console */
  enableDebug?: boolean;
}

/** Metadata extracted from PDF document */
export interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modificationDate: string | null;
  pages: number;
}

/** Individual text item with positioning information */
export interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
  x: number;
  y: number;
}

/** Layout data for a single page */
export interface PageLayoutData {
  pageNumber: number;
  textItems: TextItem[];
  viewport: {
    width: number;
    height: number;
    scale: number;
  };
}

/** Complete PDF layout data including metadata and reconstructed layout */
export interface PdfLayoutData {
  text: string;
  layoutText: string;
  metadata: PdfMetadata;
  version: string;
  pages: number;
  pageLayouts: PageLayoutData[];
  rawData: {
    textLength: number;
    hasMetadata: boolean;
    pdfVersion: string;
    totalTextItems: number;
  };
}

/** Result type for PDF extraction - either simple text or detailed layout data */
export type PdfExtractionResult = string | PdfLayoutData;

// ============================================================================
// Internal Types (for PDF.js compatibility)
// ============================================================================

interface PdfInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
}

interface PdfTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

interface PdfPage {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
  getViewport: (options: { scale: number }) => {
    width: number;
    height: number;
    scale: number;
  };
}

interface ExtendedPdfDocument {
  numPages: number;
  version?: string;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  getMetadata: () => Promise<{ info: PdfInfo }>;
}

// ============================================================================
// Core Library Functions
// ============================================================================

/**
 * Reconstructs the visual layout of text by adding appropriate spaces and newlines
 * based on the positioning information from the PDF.
 */
function reconstructLayout(
  pageLayouts: PageLayoutData[],
  options: Required<PdfExtractionOptions>
): string {
  let layoutText = "";

  for (const page of pageLayouts) {
    if (page.pageNumber > 1) {
      layoutText += "\n\n" + "=".repeat(80) + "\n";
      layoutText += `Page ${page.pageNumber}\n`;
      layoutText += "=".repeat(80) + "\n\n";
    }

    // Sort text items by Y position (top to bottom), then by X position (left to right)
    const sortedItems = [...page.textItems].sort((a, b) => {
      // Y coordinates in PDF are bottom-up, so we reverse them for top-down reading
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) < 10) {
        return a.x - b.x; // Sort by X position for same line
      }
      return yDiff; // Sort by Y position
    });

    if (sortedItems.length === 0) continue;

    // Group items by Y position more precisely using clustering
    const yGroups: Map<number, TextItem[]> = new Map();

    // First pass: cluster items by Y coordinate with tolerance
    for (const item of sortedItems) {
      let foundGroup = false;

      for (const [groupY, groupItems] of yGroups.entries()) {
        if (Math.abs(item.y - groupY) < options.yTolerance) {
          groupItems.push(item);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        yGroups.set(item.y, [item]);
      }
    }

    // Second pass: convert groups to lines, sorted by Y position
    const sortedYGroups = Array.from(yGroups.entries()).sort(
      ([a], [b]) => b - a
    ); // Sort by Y (top to bottom)
    const lines: TextItem[][] = [];

    for (const [_y, groupItems] of sortedYGroups) {
      // Sort items in each group by X position
      groupItems.sort((a, b) => a.x - b.x);
      lines.push(groupItems);

      // Debug output if enabled
      if (options.enableDebug) {
        for (const item of groupItems) {
          // Log debug information for all items when debug is enabled
          console.error(
            `DEBUG: "${item.str}" y=${item.y.toFixed(2)} x=${item.x.toFixed(
              2
            )} grouped with ${groupItems.length} items`
          );
        }
      }
    }

    // Find the leftmost position to use as baseline
    const leftmostX = Math.min(...page.textItems.map((item) => item.x));

    // Process each line to create properly spaced text
    for (const line of lines) {
      if (line.length === 0) continue;

      let lineText = "";
      let lastPos = 0;

      for (let i = 0; i < line.length; i++) {
        const item = line[i];

        // Calculate character position based on X coordinate
        const targetPos = Math.round(
          (item.x - leftmostX) / options.characterWidthDivisor
        );

        // Add spaces to reach the target position
        const spacesNeeded = Math.max(0, targetPos - lastPos);

        if (spacesNeeded > 0) {
          lineText += " ".repeat(spacesNeeded);
        }

        lineText += item.str;
        lastPos = targetPos + item.str.length;

        // For items that are very close together, add minimal spacing
        if (i < line.length - 1) {
          const nextItem = line[i + 1];
          const nextTargetPos = Math.round(
            (nextItem.x - leftmostX) / options.characterWidthDivisor
          );
          const gapSize = nextTargetPos - (targetPos + item.str.length);

          // If items are very close (less than 3 character positions), add a single space
          if (gapSize > 0 && gapSize < 3) {
            lineText += " ";
            lastPos += 1;
          }
        }
      }

      // Clean up excessive spacing while preserving structure
      layoutText += lineText.trimEnd() + "\n";
    }
  }

  return layoutText;
}

/**
 * Extracts text content from a PDF file with optional layout preservation.
 *
 * @param filePath - Path to the PDF file or Uint8Array buffer
 * @param options - Configuration options for extraction
 * @returns Promise resolving to extracted text or detailed layout data
 *
 * @example
 * ```typescript
 * // Simple text extraction
 * const text = await extractTextFromPdf("document.pdf");
 *
 * // Extract with layout information
 * const layoutData = await extractTextFromPdf("document.pdf", {
 *   includeLayout: true
 * });
 *
 * // Extract from buffer with custom options
 * const buffer = await Deno.readFile("document.pdf");
 * const result = await extractTextFromPdf(buffer, {
 *   includeLayout: true,
 *   yTolerance: 1.5,
 *   characterWidthDivisor: 3.5
 * });
 * ```
 */
export async function extractTextFromPdf(
  filePath: string | Uint8Array,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  // Set default options
  const opts: Required<PdfExtractionOptions> = {
    includeLayout: false,
    yTolerance: 2,
    characterWidthDivisor: 4.0,
    enableDebug: false,
    ...options,
  };

  try {
    // Read the PDF file as bytes
    let pdfBuffer: Uint8Array;
    if (typeof filePath === "string") {
      pdfBuffer = await Deno.readFile(filePath);
    } else {
      pdfBuffer = filePath;
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    let extractedText = "";
    const pageLayouts: PageLayoutData[] = [];
    let totalTextItems = 0;

    // Process each page
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Extract text items with layout information
      const textItems: TextItem[] = [];

      for (const item of textContent.items) {
        if ("str" in item) {
          const x = item.transform[4];
          const y = item.transform[5];

          textItems.push({
            str: item.str,
            dir: item.dir,
            width: item.width,
            height: item.height,
            transform: [...item.transform],
            fontName: item.fontName,
            hasEOL: item.hasEOL,
            x: x,
            y: y,
          });

          // Accumulate text
          extractedText += item.str;
          if (item.hasEOL) {
            extractedText += "\n";
          }
        }
      }

      totalTextItems += textItems.length;

      if (opts.includeLayout) {
        pageLayouts.push({
          pageNumber,
          textItems,
          viewport: {
            width: viewport.width,
            height: viewport.height,
            scale: viewport.scale,
          },
        });
      }
    }

    if (opts.includeLayout) {
      // Get PDF metadata
      const metadata = await pdf.getMetadata();
      const info = metadata.info as PdfInfo;
      const extendedPdf = pdf as ExtendedPdfDocument;

      // Reconstruct layout with proper spacing
      const layoutText = reconstructLayout(pageLayouts, opts);

      return {
        text: extractedText,
        layoutText: layoutText,
        metadata: {
          title: info?.Title || null,
          author: info?.Author || null,
          subject: info?.Subject || null,
          creator: info?.Creator || null,
          producer: info?.Producer || null,
          creationDate: info?.CreationDate || null,
          modificationDate: info?.ModDate || null,
          pages: pdf.numPages,
        },
        version: extendedPdf.version || "unknown",
        pages: pdf.numPages,
        pageLayouts,
        rawData: {
          textLength: extractedText.length,
          hasMetadata: !!metadata.info,
          pdfVersion: extendedPdf.version || "unknown",
          totalTextItems,
        },
      };
    }

    return extractedText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

/**
 * Convenience function to extract simple text content from a PDF.
 *
 * @param filePath - Path to the PDF file or Uint8Array buffer
 * @returns Promise resolving to extracted text content
 */
export async function extractText(
  filePath: string | Uint8Array
): Promise<string> {
  const result = await extractTextFromPdf(filePath, { includeLayout: false });
  return result as string;
}

/**
 * Convenience function to extract detailed layout data from a PDF.
 *
 * @param filePath - Path to the PDF file or Uint8Array buffer
 * @param options - Additional extraction options
 * @returns Promise resolving to detailed layout data
 */
export async function extractLayoutData(
  filePath: string | Uint8Array,
  options: Omit<PdfExtractionOptions, "includeLayout"> = {}
): Promise<PdfLayoutData> {
  const result = await extractTextFromPdf(filePath, {
    ...options,
    includeLayout: true,
  });
  return result as PdfLayoutData;
}

// ============================================================================
// Version and Library Information
// ============================================================================

/** Current version of the PDF2TXT library */
export const VERSION = "1.0.0";

/** Library information */
export const LIBRARY_INFO = {
  name: "pdf2txt",
  version: VERSION,
  description: "Extract text and layout information from PDF files",
  author: "PDF2TXT Library",
  license: "MIT",
} as const;
