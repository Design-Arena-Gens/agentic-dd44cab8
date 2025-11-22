import { NextResponse } from "next/server";
import { z } from "zod";

import { sendNotifications } from "@/lib/notifications";
import { store } from "@/lib/store";

const schema = z.object({
  orderId: z.string().min(3),
  driverId: z.string().min(3),
  message: z.string().min(10),
  channels: z.array(z.enum(["whatsapp", "sms"])).min(1),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => undefined);
  const parseResult = schema.safeParse(rawBody);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const driver = store.getDrivers().find((item) => item.id === parseResult.data.driverId);
  const notificationsPayload = {
    ...parseResult.data,
    recipient: driver?.phone ?? parseResult.data.driverId,
  };

  const responses = await sendNotifications(notificationsPayload);
  return NextResponse.json({ success: true, responses });
}
