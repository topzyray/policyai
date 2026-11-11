import { readFile } from "node:fs/promises";
import path from "node:path";
import { transformer } from "@openfga/syntax-transformer";
import type { WriteAuthorizationModelRequest } from "@openfga/sdk";

export async function loadAuthorizationModel(): Promise<WriteAuthorizationModelRequest> {
  const dsl = await readFile(path.join(process.cwd(), "fga", "model.fga"), "utf8");
  const model = transformer.transformDSLToJSONObject(dsl) as WriteAuthorizationModelRequest;
  if (model.schema_version !== "1.1" || !Array.isArray(model.type_definitions)) {
    throw new Error("The FGA authorization model could not be transformed");
  }
  return model;
}
