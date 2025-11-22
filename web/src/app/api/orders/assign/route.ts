import { NextResponse } from "next/server";
import { z } from "zod";

import { store } from "@/lib/store";

const schema = z.object({
  orderId: z.string().min(3),
  driverId: z.string().min(3),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  const parseResult = schema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { orderId, driverId } = parseResult.data;
  const order = store.assignOrder(orderId, driverId);
  if (!order) {
    return NextResponse.json(
      { error: "Unable to assign order. Check order and driver identifiers." },
      { status: 404 },
    );
  }

  return NextResponse.json({ order });
}
