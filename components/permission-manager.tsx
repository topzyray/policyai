"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DEPARTMENTS, ORGANIZATION_ID } from "@/lib/directory";
import { controlClass } from "@/components/ui/control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const kinds = [
  { value: "department_member", label: "Department member", target: "department" },
  { value: "department_manager", label: "Department manager", target: "department" },
  { value: "document_viewer", label: "Document viewer", target: "document" },
  { value: "document_editor", label: "Document editor", target: "document" },
  { value: "organization_member", label: "Organization member", target: "organization" },
  { value: "organization_admin", label: "Organization admin", target: "organization" },
] as const;

export function PermissionManager({
  tuples,
}: {
  tuples: Array<{ user: string; relation: string; object: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<(typeof kinds)[number]["value"]>("department_member");
  const selected = kinds.find((item) => item.value === kind) ?? kinds[0];

  async function submit(action: "grant" | "revoke", form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const data = new FormData(form);
    const response = await fetch("/api/admin/grants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        kind: data.get("kind"),
        subject: data.get("subject"),
        target: data.get("target"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(payload.error === "access_denied" ? "Only an organization admin can change permissions." : (payload.error ?? "Request failed"));
      return;
    }
    toast.success(action === "grant" ? "Permission granted" : "Permission revoked");
    window.location.reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <form
        className="grid content-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("grant", event.currentTarget);
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="kind">Relation</Label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
            className={controlClass}
          >
            {kinds.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subject">Auth0 subject</Label>
          <Input id="subject" name="subject" required placeholder="auth0|hr-employee" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="target">{selected.target === "document" ? "Document ID" : selected.target === "department" ? "Department" : "Organization"}</Label>
          {selected.target === "department" ? (
            <select id="target" name="target" className={controlClass}>
              {DEPARTMENTS.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="target"
              name="target"
              required
              defaultValue={selected.target === "organization" ? ORGANIZATION_ID : ""}
              readOnly={selected.target === "organization"}
              placeholder="document uuid"
            />
          )}
        </div>
        {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            Grant
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void submit("revoke", form);
            }}
          >
            Revoke
          </Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Relation</th>
              <th className="px-4 py-3 font-medium">Object</th>
            </tr>
          </thead>
          <tbody>
            {tuples.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  No directory tuples yet.
                </td>
              </tr>
            ) : (
              tuples.map((tuple) => (
                <tr key={`${tuple.user}-${tuple.relation}-${tuple.object}`} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{tuple.user}</td>
                  <td className="px-4 py-3">{tuple.relation}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tuple.object}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
