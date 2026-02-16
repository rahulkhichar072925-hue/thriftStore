import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStoreForUser, requireStoreSession } from "@/lib/server/storeAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const VALID_STATUS = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

export async function PATCH(request, { params }) {
  try {
    const complaintId = normalize(params?.id);
    const body = await request.json();
    const requestedUserId = normalize(body?.userId);
    const status = normalize(body?.status).toUpperCase();
    const adminNote = normalize(body?.adminNote);

    if (!complaintId) {
      return NextResponse.json(
        { success: false, message: "complaint id is required." },
        { status: 400 }
      );
    }

    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid complaint status." },
        { status: 400 }
      );
    }

    const session = await requireStoreSession(requestedUserId);
    if (session.error) return session.error;

    const store = await findStoreForUser(session.userId);

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found." },
        { status: 404 }
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, storeId: true },
    });

    if (!complaint || complaint.storeId !== store.id) {
      return NextResponse.json(
        { success: false, message: "Complaint not found for your store." },
        { status: 404 }
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status, adminNote },
      include: {
        user: true,
        product: true,
        order: true,
      },
    });

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
