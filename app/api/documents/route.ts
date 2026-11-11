import { requireApiUser } from "@/lib/auth/require-user";
import { ingestUpload, listDepartments, listVisibleDocuments } from "@/lib/documents/service";
import { assertClassification, validateUpload } from "@/lib/documents/validate";
import { errorResponse, HttpError } from "@/lib/http";
import { parseSearchFilters } from "@/lib/rag/search";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const url = new URL(request.url);
    const filters = parseSearchFilters({
      departmentId: url.searchParams.get("department") ?? undefined,
      classification: url.searchParams.get("classification") ?? undefined,
    });
    const [result, departments] = await Promise.all([
      listVisibleDocuments(user.sub, filters),
      listDepartments(),
    ]);
    return Response.json({ ...result, departments });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const form = await request.formData();
    const file = form.get("file");
    const title = form.get("title");
    const departmentId = form.get("departmentId");
    const classification = form.get("classification");

    if (!(file instanceof File) || typeof title !== "string" || typeof departmentId !== "string") {
      throw new HttpError(400, "invalid_upload");
    }
    if (typeof classification !== "string") throw new HttpError(400, "invalid_classification");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const upload = validateUpload({ name: file.name, bytes });
    const created = await ingestUpload({
      identity: user,
      title,
      departmentId,
      classification: assertClassification(classification),
      filename: upload.filename,
      kind: upload.kind,
      bytes,
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
