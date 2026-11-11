import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/directory";
import { HttpError } from "@/lib/http";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function assertEmbeddingConfig() {
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? EMBEDDING_MODEL;
  const dimensions = process.env.OPENAI_EMBEDDING_DIMENSIONS;
  if (model !== EMBEDDING_MODEL) {
    throw new HttpError(
      500,
      `OPENAI_EMBEDDING_MODEL must be ${EMBEDDING_MODEL} so vectors match vector(${EMBEDDING_DIMENSIONS})`,
    );
  }
  if (dimensions && Number(dimensions) !== EMBEDDING_DIMENSIONS) {
    throw new HttpError(
      500,
      `OPENAI_EMBEDDING_DIMENSIONS must be ${EMBEDDING_DIMENSIONS} to match the pgvector column`,
    );
  }
}

export function assertEmbedding(values: number[]) {
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((value) => !Number.isFinite(value))) {
    throw new HttpError(500, `Expected a ${EMBEDDING_DIMENSIONS}-dimensional embedding`);
  }
  return values;
}

function openai() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpError(503, "openai_not_configured");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export async function embedTexts(texts: string[]) {
  assertEmbeddingConfig();
  if (texts.length === 0) return [];

  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += 64) {
    const batch = texts.slice(index, index + 64);
    const response = await openai().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const ordered = [...response.data].sort((left, right) => left.index - right.index);
    if (ordered.length !== batch.length) throw new HttpError(502, "embedding_count_mismatch");
    vectors.push(...ordered.map((item) => assertEmbedding(item.embedding)));
  }

  return vectors;
}

export async function embedQuery(text: string) {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new HttpError(502, "embedding_failed");
  return vector;
}
