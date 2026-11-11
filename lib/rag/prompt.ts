import { PROMPT_EXCERPT_LIMIT } from "@/lib/directory";
import type { CitedExcerpt } from "@/lib/rag/types";

export const SYSTEM_PROMPT = [
  "You are PolicyAI, an internal knowledge assistant.",
  "Answer only from the authorized excerpts in the user message.",
  "Cite the document title for each claim.",
  "If the excerpts do not contain the answer, say that the authorized documents do not include it.",
  "Do not invent policy, numbers, or sources.",
].join(" ");

export function selectExcerpts(chunks: CitedExcerpt[], limit = PROMPT_EXCERPT_LIMIT) {
  return [...chunks].sort((left, right) => right.score - left.score).slice(0, limit);
}

export function renderAuthorizedPrompt(question: string, excerpts: CitedExcerpt[]) {
  if (excerpts.length === 0) {
    throw new Error("Refusing to render a prompt without authorized excerpts");
  }

  const body = excerpts
    .map((excerpt, index) => {
      return [
        `[${index + 1}] ${excerpt.title}`,
        `Department: ${excerpt.departmentId}`,
        `Classification: ${excerpt.classification}`,
        excerpt.content,
      ].join("\n");
    })
    .join("\n\n");

  return `Question:\n${question}\n\nAuthorized excerpts:\n${body}`;
}
