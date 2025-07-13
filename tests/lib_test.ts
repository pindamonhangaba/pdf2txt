/**
 * Basic tests for the PDF2TXT library
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  extractText,
  extractLayoutData,
  extractTextFromPdf,
  VERSION,
} from "../src/mod.ts";

Deno.test("Library exports are available", () => {
  assertExists(extractText);
  assertExists(extractLayoutData);
  assertExists(extractTextFromPdf);
  assertExists(VERSION);
});

Deno.test("Version is defined", () => {
  assertEquals(typeof VERSION, "string");
  assertEquals(VERSION, "1.0.0");
});

// Only run PDF tests if the sample file exists
const samplePdfExists = async () => {
  try {
    await Deno.stat("5236711-6f7ce.pdf");
    return true;
  } catch {
    return false;
  }
};

Deno.test("Extract text from PDF", async () => {
  if (!(await samplePdfExists())) {
    console.log("Skipping PDF test - sample file not found");
    return;
  }

  const text = await extractText("5236711-6f7ce.pdf");

  assertEquals(typeof text, "string");
  assertEquals(text.length > 0, true);
  assertEquals(text.includes("APÓLICE"), true);
});

Deno.test("Extract layout data from PDF", async () => {
  if (!(await samplePdfExists())) {
    console.log("Skipping PDF test - sample file not found");
    return;
  }

  const layoutData = await extractLayoutData("5236711-6f7ce.pdf");

  assertEquals(typeof layoutData, "object");
  assertExists(layoutData.text);
  assertExists(layoutData.layoutText);
  assertExists(layoutData.metadata);
  assertExists(layoutData.pageLayouts);

  assertEquals(typeof layoutData.metadata.pages, "number");
  assertEquals(layoutData.metadata.pages > 0, true);
  assertEquals(Array.isArray(layoutData.pageLayouts), true);
});

Deno.test("Extract with custom options", async () => {
  if (!(await samplePdfExists())) {
    console.log("Skipping PDF test - sample file not found");
    return;
  }

  const result = await extractTextFromPdf("5236711-6f7ce.pdf", {
    includeLayout: true,
    yTolerance: 1.5,
    characterWidthDivisor: 3.5,
    enableDebug: false,
  });

  assertEquals(typeof result, "object");
  if (typeof result === "object") {
    assertExists(result.layoutText);
    assertEquals(result.layoutText.includes("Parcela"), true);
  }
});

Deno.test("Error handling for non-existent file", async () => {
  try {
    await extractText("non-existent-file.pdf");
    assertEquals(true, false, "Should have thrown an error");
  } catch (error) {
    assertEquals(
      error.message.includes("Failed to extract text from PDF"),
      true
    );
  }
});
