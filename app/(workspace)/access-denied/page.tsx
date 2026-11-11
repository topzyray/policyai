import { AccessDenied } from "@/components/access-denied";

export const metadata = { title: "Access denied" };

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <AccessDenied description="Auth0 FGA did not allow this action. Document contents are not included on this page." />
    </main>
  );
}
