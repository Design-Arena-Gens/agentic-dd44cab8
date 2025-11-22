import { NextResponse } from "next/server";
import { z } from "zod";

import { store } from "@/lib/store";

const schema = z.object({
  driverId: z.string().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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

  const { driverId, latitude, longitude } = parseResult.data;
  const driver = store.updateDriverLocation(driverId, latitude, longitude);

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({ driver });
}
