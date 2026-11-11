export const ORGANIZATION_ID = "northline";
export const ORGANIZATION_NAME = "Northline";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 180;
export const SEARCH_CANDIDATE_LIMIT = 24;
export const PROMPT_EXCERPT_LIMIT = 6;

export const CLASSIFICATIONS = ["public", "internal", "restricted"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const DEPARTMENTS = [
  { id: "hr", name: "Human Resources" },
  { id: "finance", name: "Finance" },
  { id: "engineering", name: "Engineering" },
] as const;

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];

export const DEMO_SUBJECTS = {
  orgAdmin: "auth0|org-admin",
  hrManager: "auth0|hr-manager",
  hrEmployee: "auth0|hr-employee",
  financeManager: "auth0|finance-manager",
  financeEmployee: "auth0|finance-employee",
  engineeringEmployee: "auth0|engineering-employee",
} as const;

export const SAMPLE_DOCUMENTS = {
  salary: "11111111-1111-4111-8111-111111111111",
  handbook: "22222222-2222-4222-8222-222222222222",
  financeReport: "33333333-3333-4333-8333-333333333333",
  expensePolicy: "44444444-4444-4444-8444-444444444444",
  securityStandard: "55555555-5555-4555-8555-555555555555",
  codeOfConduct: "66666666-6666-4666-8666-666666666666",
} as const;

export const SENSITIVE_MARKERS = {
  salary: "HR_SALARY_BAND_RESTRICTED_7741",
  handbook: "HANDBOOK_PTO_INTERNAL_4410",
  financeReport: "FINANCE_Q3_REVENUE_RESTRICTED_8821",
  expensePolicy: "EXPENSE_POLICY_INTERNAL_3308",
  securityStandard: "ENG_SECURITY_INTERNAL_1904",
  codeOfConduct: "CONDUCT_PUBLIC_2201",
} as const;

export function departmentName(id: string) {
  return DEPARTMENTS.find((department) => department.id === id)?.name ?? id;
}

export function isDepartmentId(value: string): value is DepartmentId {
  return DEPARTMENTS.some((department) => department.id === value);
}

export function isClassification(value: string): value is Classification {
  return (CLASSIFICATIONS as readonly string[]).includes(value);
}
