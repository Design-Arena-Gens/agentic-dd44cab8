import { NextResponse } from "next/server";

import { store } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");
  let orders = store.getOrders();

  if (driverId) {
    orders = orders.filter((order) => order.assignedDriverId === driverId);
  }

  return NextResponse.json({ orders });
}
