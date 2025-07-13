import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("CLI help message contains expected text", async () => {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-read", "src/main.ts", "--help"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0);
  assertStringIncludes(output, "PDF2TXT - Convert PDF files to text");
  assertStringIncludes(output, "USAGE:");
  assertStringIncludes(output, "--input");
  assertStringIncludes(output, "--output");
});

Deno.test("CLI version command works", async () => {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-read", "src/main.ts", "--version"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0);
  assertStringIncludes(output, "pdf2txt v1.0.0");
});

Deno.test("CLI shows error when no input provided", async () => {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-read", "src/main.ts"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stderr } = await cmd.output();
  const output = new TextDecoder().decode(stderr);

  assertEquals(code, 1);
  assertStringIncludes(output, "Input file is required");
});
