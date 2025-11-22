import { NextResponse } from "next/server";
import { z } from "zod";

import { store } from "@/lib/store";

const createSchema = z.object({
  driverId: z.string().min(3),
  amount: z.number().min(0),
  notes: z.string().optional(),
});

export async function GET() {
  const cashHandovers = store.getCashHandovers();
  return NextResponse.json({ cashHandovers });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  const parseResult = createSchema.safeParse(payload);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { driverId, amount, notes } = parseResult.data;
  const handover = store.registerCashHandover(driverId, amount, notes);

  return NextResponse.json({ handover }, { status: 201 });
}
