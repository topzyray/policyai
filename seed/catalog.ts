import {
  DEMO_SUBJECTS,
  SAMPLE_DOCUMENTS,
  type Classification,
  type DepartmentId,
} from "@/lib/directory";

export type SeedDocument = {
  id: string;
  title: string;
  filename: string;
  departmentId: DepartmentId;
  classification: Classification;
  ownerSub: string;
};

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    id: SAMPLE_DOCUMENTS.salary,
    title: "FY26 Salary Bands",
    filename: "hr-salary-bands.md",
    departmentId: "hr",
    classification: "restricted",
    ownerSub: DEMO_SUBJECTS.hrManager,
  },
  {
    id: SAMPLE_DOCUMENTS.handbook,
    title: "Employee Handbook",
    filename: "hr-employee-handbook.md",
    departmentId: "hr",
    classification: "internal",
    ownerSub: DEMO_SUBJECTS.hrManager,
  },
  {
    id: SAMPLE_DOCUMENTS.financeReport,
    title: "Q3 Finance Report",
    filename: "finance-q3-report.md",
    departmentId: "finance",
    classification: "restricted",
    ownerSub: DEMO_SUBJECTS.financeManager,
  },
  {
    id: SAMPLE_DOCUMENTS.expensePolicy,
    title: "Expense Policy",
    filename: "finance-expense-policy.md",
    departmentId: "finance",
    classification: "internal",
    ownerSub: DEMO_SUBJECTS.financeManager,
  },
  {
    id: SAMPLE_DOCUMENTS.securityStandard,
    title: "Engineering Security Standard",
    filename: "engineering-security-standard.md",
    departmentId: "engineering",
    classification: "internal",
    ownerSub: DEMO_SUBJECTS.engineeringEmployee,
  },
  {
    id: SAMPLE_DOCUMENTS.codeOfConduct,
    title: "Code of Conduct",
    filename: "company-code-of-conduct.md",
    departmentId: "engineering",
    classification: "public",
    ownerSub: DEMO_SUBJECTS.orgAdmin,
  },
];
