/**
 * PDF2TXT CLI - Command-line interface for PDF text extraction
 *
 * This CLI tool provides a command-line interface to the PDF2TXT library
 * for extracting text and layout information from PDF files.
 */

import { parseArgs } from "@std/cli/parse-args";
import { exists } from "@std/fs";
import {
  extractTextFromPdf,
  PdfLayoutData,
  PdfExtractionOptions,
  VERSION,
} from "./lib.ts";

// ============================================================================
// CLI Types
// ============================================================================

interface CliOptions {
  input?: string;
  output?: string;
  help?: boolean;
  version?: boolean;
  layout?: boolean;
  json?: boolean;
  debug?: boolean;
  yTolerance?: number;
  characterWidthDivisor?: number;
}

// ============================================================================
// CLI Functions
// ============================================================================

function showHelp() {
  console.log(`
PDF2TXT - Convert PDF files to text

USAGE:
    pdf2txt [OPTIONS] --input <INPUT_FILE>

OPTIONS:
    -i, --input <FILE>                    Input PDF file path
    -o, --output <FILE>                   Output text file path (optional)
    -l, --layout                          Include layout and metadata information
    -j, --json                            Output in JSON format (useful with --layout)
    -d, --debug                           Enable debug output for layout analysis
    --y-tolerance <NUMBER>                Y-coordinate tolerance for grouping (default: 2)
    --character-width-divisor <NUMBER>    Character width divisor for positioning (default: 4.0)
    -h, --help                            Show this help message
    -v, --version                         Show version information

EXAMPLES:
    pdf2txt --input document.pdf
    pdf2txt --input document.pdf --output output.txt
    pdf2txt --input document.pdf --layout --json
    pdf2txt -i document.pdf -o output.txt --layout
    pdf2txt -i document.pdf -l -j -o metadata.json
    pdf2txt -i document.pdf --layout --debug --y-tolerance 1.5
`);
}

function showVersion() {
  console.log(`pdf2txt v${VERSION}`);
}

async function convertPdfToText(
  inputPath: string,
  outputPath?: string,
  options: PdfExtractionOptions = {},
  outputJson: boolean = false
): Promise<void> {
  try {
    // Check if input file exists
    if (!(await exists(inputPath))) {
      console.error(`Error: Input file '${inputPath}' does not exist.`);
      Deno.exit(1);
    }

    console.log(`Converting PDF: ${inputPath}`);

    // Extract text from PDF using the library
    const extractedData = await extractTextFromPdf(inputPath, options);

    let outputContent: string;

    if (options.includeLayout && typeof extractedData === "object") {
      if (outputJson) {
        outputContent = JSON.stringify(extractedData, null, 2);
      } else {
        // Format layout information in a readable way
        const data = extractedData as PdfLayoutData;
        outputContent = `=== PDF METADATA ===
Title: ${data.metadata.title || "N/A"}
Author: ${data.metadata.author || "N/A"}
Subject: ${data.metadata.subject || "N/A"}
Creator: ${data.metadata.creator || "N/A"}
Producer: ${data.metadata.producer || "N/A"}
Creation Date: ${data.metadata.creationDate || "N/A"}
Modification Date: ${data.metadata.modificationDate || "N/A"}
Pages: ${data.metadata.pages}
PDF Version: ${data.version}

=== LAYOUT INFORMATION ===
Total Text Items: ${data.rawData.totalTextItems}
Text Length: ${data.rawData.textLength} characters
Has Metadata: ${data.rawData.hasMetadata}

=== RECONSTRUCTED LAYOUT TEXT ===
${data.layoutText}

=== DETAILED PAGE LAYOUTS ===
${data.pageLayouts
  .map(
    (page) => `
Page ${page.pageNumber}:
  Viewport: ${page.viewport.width} x ${page.viewport.height}
  Text Items: ${page.textItems.length}
  Sample Items:
${page.textItems
  .slice(0, 5)
  .map(
    (item) =>
      `    "${item.str}" - Position: [${item.x.toFixed(2)}, ${item.y.toFixed(
        2
      )}], Size: ${item.width.toFixed(2)}x${item.height.toFixed(2)}, Font: ${
        item.fontName
      }`
  )
  .join("\n")}
${
  page.textItems.length > 5
    ? `    ... and ${page.textItems.length - 5} more items`
    : ""
}
`
  )
  .join("")}`;
      }
    } else {
      outputContent = extractedData as string;
    }

    if (outputPath) {
      await Deno.writeTextFile(outputPath, outputContent);
      console.log(`Text saved to: ${outputPath}`);
    } else {
      if (options.includeLayout && !outputJson) {
        console.log("Extracted content with layout information:");
      } else {
        console.log("Extracted text:");
      }
      console.log(outputContent);
    }
  } catch (error) {
    console.error(`Error processing PDF: ${error.message}`);
    Deno.exit(1);
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    alias: {
      i: "input",
      o: "output",
      h: "help",
      v: "version",
      l: "layout",
      j: "json",
      d: "debug",
    },
    boolean: ["help", "version", "layout", "json", "debug"],
    string: ["input", "output"],
    default: {
      yTolerance: 2,
      characterWidthDivisor: 4.0,
    },
  }) as CliOptions;

  // Show help
  if (args.help) {
    showHelp();
    return;
  }

  // Show version
  if (args.version) {
    showVersion();
    return;
  }

  // Validate required arguments
  if (!args.input) {
    console.error(
      "Error: Input file is required. Use --input or -i to specify a PDF file."
    );
    console.error("Use --help for more information.");
    Deno.exit(1);
  }

  // Build extraction options
  const extractionOptions: PdfExtractionOptions = {
    includeLayout: args.layout || false,
    enableDebug: args.debug || false,
  };

  // Add optional numeric parameters if provided
  if (args.yTolerance !== undefined) {
    extractionOptions.yTolerance = args.yTolerance;
  }
  if (args.characterWidthDivisor !== undefined) {
    extractionOptions.characterWidthDivisor = args.characterWidthDivisor;
  }

  // Convert PDF to text
  await convertPdfToText(
    args.input,
    args.output,
    extractionOptions,
    args.json || false
  );
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Run the CLI if this file is being executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Unexpected error:", error);
    Deno.exit(1);
  });
}
