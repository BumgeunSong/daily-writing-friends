import { NextRequest, NextResponse } from "next/server";
import {
  AdminAuthError,
  authenticateOptional,
} from "@/lib/server/auth";
import {
  AdminApiErrorBody,
  GetMeResponseSchema,
} from "@/types/admin-api-contracts";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const identity = await authenticateOptional(req);
    const body = GetMeResponseSchema.parse({ isAdmin: identity.isAdmin });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      const body: AdminApiErrorBody = { error: e.message, code: e.code };
      return NextResponse.json(body, { status: e.status });
    }
    console.error("[admin] /api/admin/me unhandled error:", e);
    const body: AdminApiErrorBody = { error: "Internal server error.", code: "server-error" };
    return NextResponse.json(body, { status: 500 });
  }
}
