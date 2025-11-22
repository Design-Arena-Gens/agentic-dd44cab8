import { NextResponse } from "next/server";

import { store } from "@/lib/store";

export async function GET() {
  const drivers = store.getDrivers();
  return NextResponse.json({ drivers });
}
