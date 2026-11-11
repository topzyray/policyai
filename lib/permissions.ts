import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { DEMO_SUBJECTS, DEPARTMENTS, ORGANIZATION_ID, isDepartmentId } from "@/lib/directory";
import { getFgaClient } from "@/lib/fga/client";
import { checkRelation, deleteTuples, readAllTuples, userRef, writeTuples } from "@/lib/fga/tuples";
import { HttpError } from "@/lib/http";
import type { TupleKey } from "@openfga/sdk";

export const grantSchema = z
  .object({
    action: z.enum(["grant", "revoke"]),
    kind: z.enum([
      "department_member",
      "department_manager",
      "organization_member",
      "organization_admin",
      "document_viewer",
      "document_editor",
    ]),
    subject: z.string().trim().regex(/^[A-Za-z0-9|@._+-]{1,200}$/),
    target: z.string().trim().min(1).max(80),
  })
  .strict();

export type GrantInput = z.infer<typeof grantSchema>;

export async function assertOrganizationAdmin(userSub: string) {
  const allowed = await checkRelation(
    await getFgaClient(),
    userSub,
    "admin",
    `organization:${ORGANIZATION_ID}`,
  );
  if (!allowed) throw new HttpError(403, "access_denied");
}

const organizationObject = `organization:${ORGANIZATION_ID}`;

export async function ensureOperatorAccess(userSub: string) {
  const client = await getFgaClient();
  if (await checkRelation(client, userSub, "admin", organizationObject)) return;

  const configured = process.env.POLICYAI_ADMIN_SUB?.trim();
  if (configured && configured !== userSub) return;

  if (!configured) {
    const tuples = await readAllTuples(client, { object: organizationObject });
    const demoAdmin = userRef(DEMO_SUBJECTS.orgAdmin);
    const hasOperator = tuples.some(
      (tuple) => tuple.key.relation === "admin" && tuple.key.user !== demoAdmin,
    );
    if (hasOperator) return;
  }

  await writeTuples(client, [
    { user: userRef(userSub), relation: "member", object: organizationObject },
    { user: userRef(userSub), relation: "admin", object: organizationObject },
  ]);
  await recordAudit([
    {
      retrievalRequestId: null,
      userSub,
      documentId: null,
      action: "permission_change",
      result: "allowed",
      detail: "grant:organization_admin:northline",
    },
  ]);
}

export function grantTuple(input: GrantInput): TupleKey {
  const user = userRef(input.subject);
  switch (input.kind) {
    case "department_member":
    case "department_manager": {
      if (!isDepartmentId(input.target)) throw new HttpError(400, "unknown_department");
      return {
        user,
        relation: input.kind === "department_member" ? "member" : "manager",
        object: `department:${input.target}`,
      };
    }
    case "organization_member":
    case "organization_admin": {
      if (input.target !== ORGANIZATION_ID) throw new HttpError(400, "unknown_organization");
      return {
        user,
        relation: input.kind === "organization_member" ? "member" : "admin",
        object: `organization:${ORGANIZATION_ID}`,
      };
    }
    case "document_viewer":
    case "document_editor": {
      if (!/^[0-9a-f-]{36}$/i.test(input.target)) throw new HttpError(400, "invalid_document_id");
      return {
        user,
        relation: input.kind === "document_viewer" ? "viewer" : "editor",
        object: `document:${input.target}`,
      };
    }
  }
}

export async function changeGrant(actorSub: string, input: GrantInput) {
  await assertOrganizationAdmin(actorSub);
  const tuple = grantTuple(input);
  const client = await getFgaClient();
  if (input.action === "grant") await writeTuples(client, [tuple]);
  else await deleteTuples(client, [tuple]);

  await recordAudit([
    {
      retrievalRequestId: null,
      userSub: actorSub,
      documentId: input.kind.startsWith("document_") ? input.target : null,
      action: "permission_change",
      result: "allowed",
      detail: `${input.action}:${input.kind}:${input.kind.startsWith("document_") ? "document" : input.target}`,
    },
  ]);
}

export async function listManagedTuples() {
  const client = await getFgaClient();
  const objects = [
    `organization:${ORGANIZATION_ID}`,
    ...DEPARTMENTS.map((department) => `department:${department.id}`),
  ];
  const tuples = [];
  for (const object of objects) {
    tuples.push(...(await readAllTuples(client, { object })));
  }
  return tuples.map((tuple) => ({
    user: tuple.key.user,
    relation: tuple.key.relation,
    object: tuple.key.object,
  }));
}
