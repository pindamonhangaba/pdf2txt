/**
 * PDF2TXT Library Usage Examples
 *
 * This file demonstrates various ways to use the PDF2TXT library
 * for extracting text and layout information from PDF files.
 */

import {
  extractText,
  extractLayoutData,
  extractTextFromPdf,
  PdfExtractionOptions,
  VERSION,
  LIBRARY_INFO,
} from "./src/mod.ts";

// ============================================================================
// Basic Usage Examples
// ============================================================================

async function basicTextExtraction() {
  console.log("=== Basic Text Extraction ===");

  try {
    // Simple text extraction
    const text = await extractText("5236711-6f7ce.pdf");
    console.log("Extracted text length:", text.length);
    console.log("First 200 characters:", text.substring(0, 200));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function layoutExtractionWithDefaults() {
  console.log("\n=== Layout Extraction with Defaults ===");

  try {
    // Extract with layout information using default settings
    const layoutData = await extractLayoutData("5236711-6f7ce.pdf");

    console.log("PDF Metadata:");
    console.log("- Title:", layoutData.metadata.title);
    console.log("- Pages:", layoutData.metadata.pages);
    console.log("- Total text items:", layoutData.rawData.totalTextItems);

    console.log("\nFirst 500 characters of reconstructed layout:");
    console.log(layoutData.layoutText.substring(0, 500));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function customOptionsExtraction() {
  console.log("\n=== Custom Options Extraction ===");

  try {
    // Extract with custom options for better table handling
    const options: PdfExtractionOptions = {
      includeLayout: true,
      yTolerance: 1.5, // Tighter Y-coordinate grouping
      characterWidthDivisor: 3.5, // Different spacing calculation
      enableDebug: false, // Disable debug output
    };

    const result = await extractTextFromPdf("5236711-6f7ce.pdf", options);

    if (typeof result === "object") {
      console.log("Custom extraction completed");
      console.log("Text length:", result.text.length);
      console.log("Layout text length:", result.layoutText.length);

      // Find and display table-like content
      const lines = result.layoutText.split("\n");
      const tableLines = lines.filter(
        (line) =>
          line.includes("Parcela") ||
          line.includes("Vencimento") ||
          line.match(/^\s*[123]\s+/)
      );

      console.log("\nTable-related lines:");
      tableLines.forEach((line) => console.log(line));
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function bufferExtraction() {
  console.log("\n=== Buffer-based Extraction ===");

  try {
    // Read PDF as buffer and extract
    const pdfBuffer = await Deno.readFile("5236711-6f7ce.pdf");

    const text = await extractText(pdfBuffer);
    console.log("Extracted from buffer, text length:", text.length);

    // Also try with layout
    const layoutData = await extractLayoutData(pdfBuffer, {
      yTolerance: 2.0,
      characterWidthDivisor: 4.0,
    });

    console.log("Layout extraction from buffer completed");
    console.log("Pages processed:", layoutData.pages);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function debugExtraction() {
  console.log("\n=== Debug Extraction ===");

  try {
    // Extract with debug output enabled
    const options: PdfExtractionOptions = {
      includeLayout: true,
      enableDebug: true, // This will show debug output for specific table values
      yTolerance: 2,
      characterWidthDivisor: 4.0,
    };

    console.log("Running extraction with debug output...");
    const result = await extractTextFromPdf("5236711-6f7ce.pdf", options);

    if (typeof result === "object") {
      console.log("Debug extraction completed");

      // Show detailed page information
      result.pageLayouts.forEach((page) => {
        console.log(`\nPage ${page.pageNumber}:`);
        console.log(
          `- Viewport: ${page.viewport.width}x${page.viewport.height}`
        );
        console.log(`- Text items: ${page.textItems.length}`);

        // Show items that might be table data
        const tableItems = page.textItems.filter(
          (item) =>
            item.str.match(/^[123]$/) ||
            item.str.includes("2025") ||
            item.str.includes("614,99")
        );

        if (tableItems.length > 0) {
          console.log("- Table-related items:");
          tableItems.forEach((item) => {
            console.log(
              `  "${item.str}" at (${item.x.toFixed(1)}, ${item.y.toFixed(1)})`
            );
          });
        }
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function errorHandlingExample() {
  console.log("\n=== Error Handling Example ===");

  try {
    // Try to extract from non-existent file
    await extractText("nonexistent.pdf");
  } catch (error) {
    console.log("Caught expected error:", error.message);
  }

  try {
    // Try to extract from invalid file
    await extractText("README.md");
  } catch (error) {
    console.log("Caught expected error for invalid PDF:", error.message);
  }
}

// ============================================================================
// Library Information
// ============================================================================

function showLibraryInfo() {
  console.log("\n=== Library Information ===");
  console.log("Version:", VERSION);
  console.log("Library Info:", LIBRARY_INFO);
}

// ============================================================================
// Main Example Runner
// ============================================================================

async function main() {
  console.log("PDF2TXT Library Usage Examples");
  console.log("===============================");

  // Show library information
  showLibraryInfo();

  // Check if example PDF exists
  try {
    await Deno.stat("5236711-6f7ce.pdf");
  } catch {
    console.log(
      "\nExample PDF not found. Please ensure '5236711-6f7ce.pdf' exists in the current directory."
    );
    return;
  }

  // Run examples
  await basicTextExtraction();
  await layoutExtractionWithDefaults();
  await customOptionsExtraction();
  await bufferExtraction();
  await debugExtraction();
  await errorHandlingExample();

  console.log("\n=== All Examples Completed ===");
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

// Export examples for use in other files
export {
  basicTextExtraction,
  layoutExtractionWithDefaults,
  customOptionsExtraction,
  bufferExtraction,
  debugExtraction,
  errorHandlingExample,
};
