import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";
import { logAdminAction } from "@/lib/server/adminAudit";
import { sendComplaintStatusEmail } from "@/lib/server/email";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const VALID_STATUS = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const complaintId = normalize(params?.id);
    const body = await request.json();
    const status = normalize(body?.status).toUpperCase();
    const adminNote = normalize(body?.adminNote);

    if (!complaintId) {
      return NextResponse.json(
        { success: false, message: "Complaint id is required." },
        { status: 400 }
      );
    }

    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid complaint status." },
        { status: 400 }
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        adminNote,
      },
      include: {
        user: true,
        product: true,
        store: true,
        order: true,
      },
    });

    await logAdminAction({
      adminUserId: admin.userId,
      action: "COMPLAINT_STATUS_UPDATED",
      targetType: "COMPLAINT",
      targetId: complaintId,
      details: {
        status,
        adminNote,
      },
    });

    sendComplaintStatusEmail({
      to: updated?.user?.email,
      complaintId,
      status: updated?.status,
      note: adminNote,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Complaint updated successfully.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update complaint." },
      { status: 500 }
    );
  }
}
