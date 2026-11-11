import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadAuthorizationModel } from "@/lib/fga/model";
import { chunkText } from "@/lib/documents/chunk";
import { sha256, validateUpload } from "@/lib/documents/validate";
import { extractDocumentText } from "@/lib/documents/extract";
import { HttpError } from "@/lib/http";

describe("authorization model", () => {
  it("transforms the DSL into the document, department, and organization model", async () => {
    const model = await loadAuthorizationModel();
    const types = model.type_definitions.map((type) => type.type);
    expect(types).toEqual(["user", "organization", "department", "document"]);
    const document = model.type_definitions.find((type) => type.type === "document");
    expect(document?.relations).toMatchObject({
      owner: expect.anything(),
      editor: expect.anything(),
      viewer: expect.anything(),
      can_view: expect.anything(),
    });
    expect(model.conditions).toHaveProperty("non_restricted_classification");
    expect(model.conditions).toHaveProperty("public_classification");
  });
});

describe("document files", () => {
  it("rejects unsupported files, invalid PDFs, and oversized uploads", () => {
    expect(() => validateUpload({ name: "notes.exe", bytes: new Uint8Array([1, 2, 3]) })).toThrow(HttpError);
    expect(() => validateUpload({ name: "notes.pdf", bytes: new TextEncoder().encode("not a pdf") })).toThrow(HttpError);
    expect(() => validateUpload({ name: "notes.txt", bytes: new Uint8Array([104, 105, 0]) })).toThrow(HttpError);
    const huge = new Uint8Array(8 * 1024 * 1024 + 1);
    expect(() => validateUpload({ name: "notes.txt", bytes: huge })).toThrow(HttpError);
  });

  it("reads text files as data and does not execute their contents", async () => {
    const source = "process.exit(1)\nHello from a text file";
    const bytes = new TextEncoder().encode(source);
    const upload = validateUpload({ name: "../secret notes.txt", bytes });
    expect(upload.kind).toBe("txt");
    expect(upload.filename).not.toContain("/");
    const text = await extractDocumentText("txt", bytes);
    expect(text).toContain("process.exit(1)");
    expect(text).toContain("Hello from a text file");
    expect(sha256(bytes)).toHaveLength(64);
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(2500);
    const chunks = chunkText(text, 1000, 180);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.length).toBeLessThanOrEqual(1000);
    const overlap = chunks[0]!.slice(-180);
    expect(chunks[1]!.startsWith(overlap)).toBe(true);
  });

  it("keeps the sensitive markers in the seed dataset", async () => {
    const salary = await readFile("seed/documents/hr-salary-bands.md", "utf8");
    const handbook = await readFile("seed/documents/hr-employee-handbook.md", "utf8");
    const finance = await readFile("seed/documents/finance-q3-report.md", "utf8");
    expect(salary).toContain("HR_SALARY_BAND_RESTRICTED_7741");
    expect(handbook).toContain("HANDBOOK_PTO_INTERNAL_4410");
    expect(finance).toContain("FINANCE_Q3_REVENUE_RESTRICTED_8821");
  });
});
