import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { OpenFgaClient } from "@openfga/sdk";
import { createFgaAuthorizer } from "@/lib/fga/authorizer";
import { checkRelation, directoryTuples, documentRef, documentTuples, syncDocumentAuthorization, writeTuples } from "@/lib/fga/tuples";
import { answerQuestion } from "@/lib/rag/answer";
import { DEMO_SUBJECTS, SENSITIVE_MARKERS } from "@/lib/directory";
import type { AuditEventInput, CandidateChunk } from "@/lib/rag/types";
import { SEED_DOCUMENTS } from "@/seed/catalog";
import { createTestFga } from "./stack";

let client: OpenFgaClient;

beforeAll(async () => {
  client = await createTestFga();
  await writeTuples(client, directoryTuples());
  for (const document of SEED_DOCUMENTS) {
    await writeTuples(client, documentTuples(document));
  }
  const salary = SEED_DOCUMENTS.find((document) => document.id.endsWith("111111111111"));
  if (!salary) throw new Error("missing salary sample");
  await syncDocumentAuthorization(client, salary);
}, 120_000);

async function text(filename: string) {
  return readFile(path.join(process.cwd(), "seed", "documents", filename), "utf8");
}

async function candidates(): Promise<CandidateChunk[]> {
  const files = await Promise.all(SEED_DOCUMENTS.map(async (document) => ({ document, content: await text(document.filename) })));
  return files.map(({ document, content }, index) => ({
    documentId: document.id,
    chunkIndex: 0,
    content,
    title: document.title,
    departmentId: document.departmentId,
    classification: document.classification,
    score: 1 - index * 0.01,
  }));
}

async function ask(userSub: string, chunks: CandidateChunk[]) {
  const prompts: string[] = [];
  const audits: AuditEventInput[] = [];
  const seen: Array<{ context?: unknown; relation: string }> = [];
  const wrapped = new Proxy(client, {
    get(target, property, receiver) {
      if (property === "batchCheck") {
        return async (body: Parameters<OpenFgaClient["batchCheck"]>[0]) => {
          for (const check of body.checks) {
            seen.push({ context: check.context, relation: check.relation });
          }
          return target.batchCheck(body);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  const result = await answerQuestion({
    userSub,
    question: "Summarize the policies that apply to me.",
    candidates: chunks,
    authorizer: createFgaAuthorizer(wrapped),
    complete: async (prompt) => {
      prompts.push(prompt);
      return "Answer from authorized excerpts.";
    },
    audit: async (events) => {
      audits.push(...events);
    },
    retrievalRequestId: "99999999-9999-4999-8999-999999999999",
  });

  return { result, prompts, audits, checks: seen };
}

describe("Auth0 FGA document access", () => {
  it("lets an HR manager view the salary document", async () => {
    await expect(checkRelation(client, DEMO_SUBJECTS.hrManager, "can_view", documentRef(SEED_DOCUMENTS[0]!.id))).resolves.toBe(true);
  });

  it("denies a general HR employee the salary document", async () => {
    const salary = SEED_DOCUMENTS[0]!;
    const handbook = SEED_DOCUMENTS[1]!;
    await expect(checkRelation(client, DEMO_SUBJECTS.hrEmployee, "can_view", documentRef(salary.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.hrEmployee, "can_view", documentRef(handbook.id))).resolves.toBe(true);
  });

  it("lets a finance manager view the financial report", async () => {
    const report = SEED_DOCUMENTS[2]!;
    await expect(checkRelation(client, DEMO_SUBJECTS.financeManager, "can_view", documentRef(report.id))).resolves.toBe(true);
  });

  it("denies another department's restricted documents", async () => {
    const salary = SEED_DOCUMENTS[0]!;
    const report = SEED_DOCUMENTS[2]!;
    const security = SEED_DOCUMENTS[4]!;
    await expect(checkRelation(client, DEMO_SUBJECTS.financeEmployee, "can_view", documentRef(salary.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.hrEmployee, "can_view", documentRef(report.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.engineeringEmployee, "can_view", documentRef(salary.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.engineeringEmployee, "can_view", documentRef(report.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.hrManager, "can_view", documentRef(report.id))).resolves.toBe(false);
    await expect(checkRelation(client, DEMO_SUBJECTS.hrEmployee, "can_view", documentRef(security.id))).resolves.toBe(false);
    await expect(
      checkRelation(client, DEMO_SUBJECTS.engineeringEmployee, "can_view", documentRef(SEED_DOCUMENTS[5]!.id)),
    ).resolves.toBe(true);
  });

  it("never places unauthorized document text in the model prompt", async () => {
    const chunks = await candidates();

    const employee = await ask(DEMO_SUBJECTS.hrEmployee, chunks);
    expect(employee.checks.every((check) => check.context === undefined && check.relation === "can_view")).toBe(true);
    expect(employee.result.modelCalled).toBe(true);
    expect(employee.prompts).toHaveLength(1);
    expect(employee.prompts[0]).toContain(SENSITIVE_MARKERS.handbook);
    expect(employee.prompts[0]).not.toContain(SENSITIVE_MARKERS.salary);
    expect(employee.prompts[0]).not.toContain(SENSITIVE_MARKERS.financeReport);
    expect(employee.prompts[0]).not.toContain(SENSITIVE_MARKERS.securityStandard);
    expect(JSON.stringify(employee.audits)).not.toContain(SENSITIVE_MARKERS.salary);
    expect(employee.result.sources.map((source) => source.documentId)).not.toContain(SEED_DOCUMENTS[0]!.id);

    const manager = await ask(DEMO_SUBJECTS.hrManager, chunks);
    expect(manager.prompts[0]).toContain(SENSITIVE_MARKERS.salary);
    expect(manager.prompts[0]).toContain(SENSITIVE_MARKERS.handbook);
    expect(manager.prompts[0]).not.toContain(SENSITIVE_MARKERS.financeReport);

    const finance = await ask(DEMO_SUBJECTS.financeManager, chunks);
    expect(finance.prompts[0]).toContain(SENSITIVE_MARKERS.financeReport);
    expect(finance.prompts[0]).not.toContain(SENSITIVE_MARKERS.salary);

    const blocked = await ask(
      DEMO_SUBJECTS.engineeringEmployee,
      chunks.filter((chunk) => chunk.classification === "restricted"),
    );
    expect(blocked.result.modelCalled).toBe(false);
    expect(blocked.prompts).toHaveLength(0);
    expect(blocked.result.answer).not.toContain(SENSITIVE_MARKERS.salary);
    expect(blocked.result.answer).not.toContain(SENSITIVE_MARKERS.financeReport);
  });
});
