"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) {
      setError("This document could not be deleted.");
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant="danger" size="sm" onClick={() => void onClick()} disabled={pending}>
        {pending ? "Deleting" : "Delete"}
      </Button>
      {error ? <p className="mt-2 text-sm text-[#7f1d1d]">{error}</p> : null}
    </div>
  );
}
