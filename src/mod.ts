/**
 * PDF2TXT Library - Main Export Module
 *
 * This module exports all public functionality of the PDF2TXT library
 * for extracting text and layout information from PDF files.
 */

// Re-export all public types and functions from the library
export {
  // Main extraction functions
  extractTextFromPdf,
  extractText,
  extractLayoutData,

  // Types
  type PdfExtractionOptions,
  type PdfExtractionResult,
  type PdfMetadata,
  type TextItem,
  type PageLayoutData,
  type PdfLayoutData,

  // Constants
  VERSION,
  LIBRARY_INFO,
} from "./lib.ts";
