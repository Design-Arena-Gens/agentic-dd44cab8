import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { store } from "@/lib/store";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await request.json().catch(() => undefined);
  const parseResult = schema.safeParse(payload);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const handover = store.updateCashHandoverStatus(id, parseResult.data.status);

  if (!handover) {
    return NextResponse.json({ error: "Cash handover not found" }, { status: 404 });
  }

  return NextResponse.json({ handover });
}
