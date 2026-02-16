import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const notificationId = String(body?.id || "").trim();

    if (notificationId) {
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update notifications." },
      { status: 500 }
    );
  }
}
