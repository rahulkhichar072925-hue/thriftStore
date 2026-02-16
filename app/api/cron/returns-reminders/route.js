import { NextResponse } from "next/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/server/notifications";
import { sendReturnStatusEmail } from "@/lib/server/email";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function POST(request) {
  try {
    const secret = normalize(process.env.CRON_SECRET);
    const authHeader = normalize(request.headers.get("authorization"));
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const pending = await prisma.return.findMany({
      where: {
        pickupDate: {
          gte: now,
          lte: in24Hours,
        },
        pickupReminderSentAt: null,
      },
      include: {
        user: true,
        product: true,
      },
    });

    for (const item of pending) {
      await createNotification({
        userId: item.userId,
        title: "Pickup reminder",
        body: `Pickup is scheduled for ${item.product?.name || "your item"}.`,
        type: "return",
        meta: { returnId: item.id, pickupDate: item.pickupDate },
      });

      if (item.user?.email) {
        sendReturnStatusEmail({
          to: item.user.email,
          returnId: item.id,
          status: "PICKUP_REMINDER",
          pickupDate: item.pickupDate,
          pickupWindow: item.pickupWindow,
          pickupAddress: item.pickupAddress,
          refundAmount: item.refundAmount,
        }).catch(() => {});
      }

      await prisma.return.update({
        where: { id: item.id },
        data: { pickupReminderSentAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${pending.length} pickup reminder(s).`,
      data: { count: pending.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send pickup reminders." },
      { status: 500 }
    );
  }
}
