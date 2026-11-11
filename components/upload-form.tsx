"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DEPARTMENTS } from "@/lib/directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/documents", { method: "POST", body: form });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(messageFor(payload.error));
      return;
    }
    event.currentTarget.reset();
    toast.success("Document uploaded and authorized");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={180} placeholder="FY26 salary bands" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="departmentId">Department</Label>
          <select id="departmentId" name="departmentId" className="h-10 rounded-md border border-border bg-white px-3 text-sm" required>
            {DEPARTMENTS.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="classification">Classification</Label>
          <select id="classification" name="classification" className="h-10 rounded-md border border-border bg-white px-3 text-sm" defaultValue="internal">
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown" required />
        <p className="text-xs text-muted">PDF, text, or Markdown. Maximum 8 MB. The file is parsed as text and never executed.</p>
      </div>
      {error ? <p className="text-sm text-[#7f1d1d]">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading" : "Upload document"}
      </Button>
    </form>
  );
}

function messageFor(code: string | undefined) {
  switch (code) {
    case "access_denied":
      return "You cannot upload this classification to that department.";
    case "unsupported_file_type":
      return "Only PDF, TXT, and Markdown files are accepted.";
    case "invalid_pdf":
      return "That file does not look like a PDF.";
    case "file_too_large":
      return "Files must be 8 MB or smaller.";
    case "openai_not_configured":
      return "OpenAI is not configured, so embeddings cannot be created.";
    case "fga_not_configured":
      return "Auth0 FGA is not configured. Run the bootstrap script.";
    default:
      return code ?? "Upload failed";
  }
}
