import { requireApiUser } from "@/lib/auth/require-user";
import { deleteDocument, readAuthorizedDocument } from "@/lib/documents/service";
import { errorResponse } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const document = await readAuthorizedDocument(user.sub, id);
    return Response.json({
      id: document.id,
      title: document.title,
      originalFilename: document.originalFilename,
      departmentId: document.departmentId,
      classification: document.classification,
      ownerSub: document.ownerSub,
      uploadedBySub: document.uploadedBySub,
      contentHash: document.contentHash,
      createdAt: document.createdAt,
      bodyText: document.bodyText,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    await deleteDocument(user.sub, id);
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
