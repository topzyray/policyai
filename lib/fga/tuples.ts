import {
  ClientWriteRequestOnDuplicateWrites,
  ClientWriteRequestOnMissingDeletes,
  OpenFgaClient,
  type TupleKey,
  type TupleKeyWithoutCondition,
} from "@openfga/sdk";
import {
  DEMO_SUBJECTS,
  DEPARTMENTS,
  ORGANIZATION_ID,
  type Classification,
} from "@/lib/directory";

const writeOptions = {
  conflict: { onDuplicateWrites: ClientWriteRequestOnDuplicateWrites.Ignore },
};

const deleteOptions = {
  conflict: { onMissingDeletes: ClientWriteRequestOnMissingDeletes.Ignore },
};

export type DocumentGrant = {
  id: string;
  ownerSub: string;
  departmentId: string;
  classification: Classification;
};

export function userRef(sub: string) {
  return `user:${sub}`;
}

export function documentRef(id: string) {
  return `document:${id}`;
}

export function documentTuples(document: DocumentGrant): TupleKey[] {
  const object = documentRef(document.id);
  return [
    { user: userRef(document.ownerSub), relation: "owner", object },
    { user: `department:${document.departmentId}`, relation: "department", object },
    { user: `organization:${ORGANIZATION_ID}`, relation: "organization", object },
    {
      user: `department:${document.departmentId}#member`,
      relation: "viewer",
      object,
      condition: {
        name: "non_restricted_classification",
        context: { classification: document.classification },
      },
    },
    {
      user: `organization:${ORGANIZATION_ID}#member`,
      relation: "viewer",
      object,
      condition: {
        name: "public_classification",
        context: { classification: document.classification },
      },
    },
  ];
}

export function directoryTuples(adminSubs: string[] = []): TupleKey[] {
  const admins = [...new Set(adminSubs.filter(Boolean))];
  const people = new Set<string>([...Object.values(DEMO_SUBJECTS), ...admins]);
  const tuples: TupleKey[] = [];

  for (const sub of people) {
    tuples.push({
      user: userRef(sub),
      relation: "member",
      object: `organization:${ORGANIZATION_ID}`,
    });
  }

  for (const sub of new Set([DEMO_SUBJECTS.orgAdmin, ...admins])) {
    tuples.push({
      user: userRef(sub),
      relation: "admin",
      object: `organization:${ORGANIZATION_ID}`,
    });
  }

  const memberships: Array<[string, string, "member" | "manager"]> = [
    [DEMO_SUBJECTS.hrManager, "hr", "manager"],
    [DEMO_SUBJECTS.hrManager, "hr", "member"],
    [DEMO_SUBJECTS.hrEmployee, "hr", "member"],
    [DEMO_SUBJECTS.financeManager, "finance", "manager"],
    [DEMO_SUBJECTS.financeManager, "finance", "member"],
    [DEMO_SUBJECTS.financeEmployee, "finance", "member"],
    [DEMO_SUBJECTS.engineeringEmployee, "engineering", "member"],
  ];

  for (const [sub, departmentId, relation] of memberships) {
    tuples.push({ user: userRef(sub), relation, object: `department:${departmentId}` });
  }

  for (const department of DEPARTMENTS) {
    tuples.push({
      user: `organization:${ORGANIZATION_ID}`,
      relation: "organization",
      object: `department:${department.id}`,
    });
  }

  return tuples;
}

export async function writeTuples(client: OpenFgaClient, tuples: TupleKey[]) {
  if (tuples.length === 0) return;
  await client.writeTuples(tuples, writeOptions);
}

export async function deleteTuples(client: OpenFgaClient, tuples: TupleKeyWithoutCondition[]) {
  if (tuples.length === 0) return;
  await client.deleteTuples(tuples, deleteOptions);
}

export async function readAllTuples(
  client: OpenFgaClient,
  filter: { object?: string; user?: string; relation?: string },
) {
  const collected = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.read(filter, { pageSize: 100, continuationToken });
    collected.push(...page.tuples);
    continuationToken = page.continuation_token || undefined;
  } while (continuationToken);
  return collected;
}

export async function syncDocumentAuthorization(client: OpenFgaClient, document: DocumentGrant) {
  const existing = await readAllTuples(client, { object: documentRef(document.id) });
  const explicit = existing
    .map((tuple) => tuple.key)
    .filter(
      (key) =>
        (key.relation === "viewer" || key.relation === "editor") &&
        key.user.startsWith("user:") &&
        !key.condition,
    );

  if (existing.length > 0) {
    await deleteTuples(
      client,
      existing.map((tuple) => ({
        user: tuple.key.user,
        relation: tuple.key.relation,
        object: tuple.key.object,
      })),
    );
  }

  await writeTuples(client, [...documentTuples(document), ...explicit]);
}

export async function checkRelation(
  client: OpenFgaClient,
  userSub: string,
  relation: string,
  object: string,
) {
  const response = await client.check({
    user: userRef(userSub),
    relation,
    object,
  });
  return response.allowed === true;
}
