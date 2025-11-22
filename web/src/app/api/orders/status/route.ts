import { NextResponse } from "next/server";
import { z } from "zod";

import { store } from "@/lib/store";

const schema = z.object({
  orderId: z.string().min(3),
  status: z
    .enum(["pending", "accepted", "picked_up", "in_transit", "delivered", "returned"])
    .default("pending"),
  cashCollected: z.number().nonnegative().optional(),
  note: z.string().optional(),
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

  const { orderId, status, cashCollected, note } = parseResult.data;
  const order = store.updateOrderStatus(orderId, status, cashCollected, note);

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ order });
}
