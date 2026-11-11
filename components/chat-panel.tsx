"use client";

import { useState } from "react";
import { ClassificationBadge } from "@/components/classification-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENTS } from "@/lib/directory";

type Source = {
  documentId: string;
  title: string;
  departmentId: string;
  classification: string;
  chunkIndex: number;
  content: string;
  score: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  withheldCount?: number;
  retrievalRequestId?: string;
};

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState(0);

  const active = messages[selected];
  const sources = active?.sources ?? [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setPending(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: text,
        departmentId: departmentId || undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      answer?: string;
      sources?: Source[];
      withheldCount?: number;
      retrievalRequestId?: string;
    };
    setPending(false);
    if (!response.ok || !payload.answer) {
      setError(payload.error === "access_denied" ? "Access denied." : (payload.error ?? "The question could not be answered."));
      return;
    }
    setMessages((current) => {
      const next = [
        ...current,
        {
          role: "assistant" as const,
          content: payload.answer!,
          sources: payload.sources ?? [],
          withheldCount: payload.withheldCount,
          retrievalRequestId: payload.retrievalRequestId,
        },
      ];
      setSelected(next.length - 1);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[32rem] flex-col rounded-lg border border-border bg-card">
        <div className="flex-1 space-y-4 px-5 py-5">
          {messages.length === 0 ? (
            <div className="rounded-md bg-[#f7f1e4] px-4 py-4 text-sm leading-6 text-muted">
              Ask about company policy. PolicyAI searches the library, asks Auth0 FGA which documents you can view, and sends only those excerpts to the model.
            </div>
          ) : (
            messages.map((message, index) => (
              <button
                key={`${message.role}-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                className={`block w-full rounded-md px-4 py-3 text-left text-sm leading-6 whitespace-pre-wrap ${message.role === "user" ? "bg-[#f7f1e4]" : "bg-white"} ${selected === index ? "ring-1 ring-gold" : ""}`}
              >
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">{message.role === "user" ? "You" : "PolicyAI"}</span>
                {message.content}
              </button>
            ))
          )}
        </div>
        <form onSubmit={onSubmit} className="border-t border-border p-4">
          <div className="mb-3">
            <label htmlFor="department" className="mb-1 block text-xs text-muted">
              Department filter
            </label>
            <select
              id="department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="h-9 rounded-md border border-border bg-white px-2 text-sm"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What is the parental leave policy?"
            required
          />
          {error ? <p className="mt-2 text-sm text-[#7f1d1d]">{error}</p> : null}
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Checking access" : "Ask"}
            </Button>
          </div>
        </form>
      </section>
      <aside className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-serif text-2xl">Sources</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Only excerpts that passed an FGA can_view check are shown or sent to the model.</p>
        {active?.withheldCount ? (
          <p className="mt-4 rounded-md bg-[#fff8ee] px-3 py-2 text-xs leading-5 text-amber-950">
            Access policy withheld {active.withheldCount} matching document{active.withheldCount === 1 ? "" : "s"}. Their contents were not used.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {sources.length === 0 ? (
            <p className="text-sm text-muted">Citations appear here after an answer.</p>
          ) : (
            sources.map((source) => (
              <article key={`${source.documentId}-${source.chunkIndex}`} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium">{source.title}</h3>
                  <ClassificationBadge value={source.classification} />
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{source.departmentId}</p>
                <p className="mt-2 line-clamp-6 text-xs leading-5 text-ink/80">{source.content}</p>
              </article>
            ))
          )}
        </div>
        {active?.retrievalRequestId ? (
          <p className="mt-4 break-all text-[11px] text-muted">Request {active.retrievalRequestId}</p>
        ) : null}
      </aside>
    </div>
  );
}
