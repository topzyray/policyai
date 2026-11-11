import { DEFAULT_CHAT_MODEL } from "@/lib/directory";
import { HttpError } from "@/lib/http";
import { SYSTEM_PROMPT } from "@/lib/rag/prompt";
import OpenAI from "openai";

let client: OpenAI | null = null;

function openai() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpError(503, "openai_not_configured");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export async function completeWithOpenAI(prompt: string) {
  const response = await openai().chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || DEFAULT_CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim();
  if (!answer) throw new HttpError(502, "empty_model_response");
  return answer;
}
