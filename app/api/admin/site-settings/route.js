import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const getAdminStore = async (adminUserId) => {
  const recentStores = await prisma.store.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const thriftStore =
    recentStores.find((store) => (store?.name || "").trim().toLowerCase() === "thriftstore") ||
    recentStores.find((store) => (store?.username || "").trim().toLowerCase() === "thriftstore");

  if (thriftStore) return thriftStore;

  return prisma.store.findFirst({
    where: { userId: adminUserId },
    orderBy: { updatedAt: "desc" },
  });
};

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const store = await getAdminStore(admin.userId);
    if (!store) {
      return NextResponse.json(
        { success: false, message: "Admin store not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: store.email || "",
        contact: store.contact || "",
        address: store.address || "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const body = await request.json();
    const email = normalize(body?.email);
    const contact = normalize(body?.contact);
    const address = normalize(body?.address);

    if (!email || !contact || !address) {
      return NextResponse.json(
        { success: false, message: "Email, contact and address are required." },
        { status: 400 }
      );
    }

    const store = await getAdminStore(admin.userId);
    if (!store) {
      return NextResponse.json(
        { success: false, message: "Admin store not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { email, contact, address },
      select: {
        email: true,
        contact: true,
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Site contact settings updated.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
