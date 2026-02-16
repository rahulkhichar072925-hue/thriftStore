import { NextResponse } from "next/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";
import { createNotification } from "@/lib/server/notifications";
import { sendReturnStatusEmail } from "@/lib/server/email";
import { creditWallet } from "@/lib/server/wallet";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const VALID_STATUS = ["REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED", "REJECTED"];

export async function PATCH(request, { params }) {
  try {
    const origin = new URL(request.url).origin;
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const returnId = normalize(params?.id);
    const body = await request.json();
    const status = normalize(body?.status).toUpperCase();
    const adminNote = normalize(body?.adminNote);
    const pickupDate = body?.pickupDate ? new Date(body.pickupDate) : null;
    const pickupWindow = normalize(body?.pickupWindow);
    const pickupAddress = normalize(body?.pickupAddress);
    const pickupNote = normalize(body?.pickupNote);

    if (!returnId) {
      return NextResponse.json(
        { success: false, message: "return id is required." },
        { status: 400 }
      );
    }

    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid return status." },
        { status: 400 }
      );
    }

    const existing = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        order: { include: { orderItems: true } },
        product: true,
        user: true,
        store: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Return request not found." },
        { status: 404 }
      );
    }

    const timeline = Array.isArray(existing.statusTimeline)
      ? [...existing.statusTimeline]
      : [];
    if (existing.status !== status) {
      timeline.push({ status, at: new Date().toISOString() });
    }

    let refundAmount = existing.refundAmount || 0;
    let refundedAt = existing.refundedAt || null;
    if (status === "REFUNDED" && existing.order?.orderItems?.length) {
      const matching = existing.order.orderItems.filter(
        (item) => item.productId === existing.productId
      );
      refundAmount = matching.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      );
      refundedAt = new Date();
    }

    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        status,
        adminNote,
        statusTimeline: timeline,
        refundAmount,
        refundedAt,
        pickupDate,
        pickupWindow,
        pickupAddress,
        pickupNote,
      },
      include: {
        user: true,
        product: true,
        store: true,
        order: true,
      },
    });

    if (existing.status !== status) {
      await createNotification({
        userId: existing.userId,
        title: "Return status updated",
        body: `Your return for ${existing.product?.name || "item"} is now ${status}.`,
        type: "return",
        meta: { returnId, status },
      });
    }
    if (existing.status !== "REFUNDED" && status === "REFUNDED" && refundAmount > 0) {
      await creditWallet({
        userId: existing.userId,
        amount: refundAmount,
        reason: `Refund for return ${String(returnId).slice(0, 8)}`,
      });
    }
    if (existing.user?.email && existing.status !== status) {
      sendReturnStatusEmail({
        to: existing.user.email,
        returnId,
        status,
        note: adminNote,
        pickupDate,
        pickupWindow,
        pickupAddress,
        refundAmount,
        receiptUrl: status === "REFUNDED" ? `${origin}/account/returns/receipt/${returnId}` : "",
      }).catch(() => {});
    }
    const pickupChanged =
      pickupDate &&
      (!existing.pickupDate ||
        new Date(existing.pickupDate).getTime() !== pickupDate.getTime());
    if (pickupChanged) {
      await createNotification({
        userId: existing.userId,
        title: "Return pickup scheduled",
        body: `Pickup scheduled for ${existing.product?.name || "item"}.`,
        type: "return",
        meta: { returnId, pickupDate, pickupWindow, pickupAddress },
      });
    }
    if (existing.user?.email && pickupChanged) {
      sendReturnStatusEmail({
        to: existing.user.email,
        returnId,
        status: "PICKUP_SCHEDULED",
        note: pickupNote,
        pickupDate,
        pickupWindow,
        pickupAddress,
        refundAmount,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Return updated successfully.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update return." },
      { status: 500 }
    );
  }
}
