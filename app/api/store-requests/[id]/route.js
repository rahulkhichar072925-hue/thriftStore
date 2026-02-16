import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { logAdminAction } from "@/lib/server/adminAudit";
import { sendStoreRequestStatusEmail } from "@/lib/server/email";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const isProtectedAdminStore = (store) => {
  const name = normalize(store?.name).toLowerCase();
  const username = normalize(store?.username).toLowerCase();
  return name === "thriftstore" || username === "thriftstore";
};
const splitWords = (value) =>
  normalize(value)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

const hashText = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const shouldAutoGenerateLogo = (logo) => {
  const current = normalize(logo).toLowerCase();
  return !current || current === "/favicon.ico" || current.includes("/server/assets/");
};

const buildAutoLogo = (storeName) => {
  const words = splitWords(storeName);
  const firstWord = words[0] || "Store";
  const hash = hashText(firstWord + words.join(""));

  let secondToken = firstWord;
  if (words.length > 1) {
    const index = (hash % (words.length - 1)) + 1;
    secondToken = words[index] || words[1];
  } else {
    const letters = firstWord.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 2) {
      const index = Math.max(1, hash % letters.length);
      secondToken = letters[index];
    }
  }

  const firstLetter = firstWord.charAt(0).toUpperCase() || "S";
  const secondLetter = (secondToken.charAt(0) || firstLetter).toUpperCase();
  const initials = `${firstLetter}${secondLetter}`;

  const hueA = hash % 360;
  const hueB = (hueA + 45) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='hsl(${hueA} 78% 50%)'/><stop offset='100%' stop-color='hsl(${hueB} 76% 40%)'/></linearGradient></defs><rect width='240' height='240' rx='120' fill='url(#g)'/><circle cx='120' cy='120' r='73' fill='rgba(255,255,255,0.18)'/><text x='120' y='138' text-anchor='middle' fill='white' font-size='72' font-family='Arial, Helvetica, sans-serif' font-weight='700'>${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const syncUserRole = async (userId, role) => {
  if (!userId || !role) return;
  const client = await clerkClient();
  const existingUser = await client.users.getUser(userId);
  const existingRole = String(existingUser?.publicMetadata?.role || "").toLowerCase();
  if (existingRole === "admin") return;
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });
};

export async function PATCH(request, { params }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const storeId = normalize(params?.id);
    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "Store id is required." },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findUnique({ where: { id: storeId } });
    if (!existingStore) {
      return NextResponse.json(
        { success: false, message: "Store not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const hasStatus = typeof body.status === "string";
    const hasIsActive = typeof body.isActive === "boolean";

    if (!hasStatus && !hasIsActive) {
      return NextResponse.json(
        { success: false, message: "Nothing to update." },
        { status: 400 }
      );
    }

    const data = {};
    let status = "";

    if (hasStatus) {
      status = normalize(body.status).toLowerCase();
      const allowed = ["approved", "rejected", "pending"];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status." },
          { status: 400 }
        );
      }
      data.status = status;
      data.isActive = status === "approved";
      if (status === "approved" && shouldAutoGenerateLogo(existingStore.logo)) {
        data.logo = buildAutoLogo(existingStore.name);
      }
    }

    if (hasIsActive) {
      if (isProtectedAdminStore(existingStore) && body.isActive === false) {
        return NextResponse.json(
          { success: false, message: "ThriftStore is admin store and cannot be deactivated." },
          { status: 403 }
        );
      }
      data.isActive = body.isActive;
      if (body.isActive) data.status = "approved";
    }

    const updated = await prisma.store.update({
      where: { id: storeId },
      data,
    });

    await logAdminAction({
      adminUserId: admin.userId,
      action: hasStatus ? `STORE_${status.toUpperCase()}` : `STORE_${updated.isActive ? "ACTIVATED" : "DEACTIVATED"}`,
      targetType: "STORE",
      targetId: storeId,
      details: {
        storeName: existingStore.name,
        previousStatus: existingStore.status,
        nextStatus: updated.status,
        previousIsActive: existingStore.isActive,
        nextIsActive: updated.isActive,
      },
    });

    try {
      if (hasStatus && status === "approved") {
        await syncUserRole(existingStore.userId, "seller");
      }

      if (hasStatus && status === "rejected") {
        const otherApprovedStores = await prisma.store.count({
          where: {
            userId: existingStore.userId,
            id: { not: storeId },
            status: "approved",
            isActive: true,
          },
        });
        if (otherApprovedStores === 0) {
          await syncUserRole(existingStore.userId, "user");
        }
      }
    } catch {
      // Role sync failure should not block store status update.
    }

    if (hasStatus && (status === "approved" || status === "rejected")) {
      sendStoreRequestStatusEmail({
        to: existingStore.email,
        storeName: existingStore.name,
        status,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: hasStatus
        ? status === "approved"
          ? "Store approved successfully."
          : status === "rejected"
          ? "Store rejected."
          : "Store moved to pending."
        : updated.isActive
        ? "Store activated."
        : "Store deactivated.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update store status." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const storeId = normalize(params?.id);
    if (!storeId) {
      return NextResponse.json(
        { success: false, message: "Store id is required." },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findUnique({ where: { id: storeId } });
    if (!existingStore) {
      return NextResponse.json(
        { success: false, message: "Store not found." },
        { status: 404 }
      );
    }

    if (isProtectedAdminStore(existingStore)) {
      return NextResponse.json(
        { success: false, message: "ThriftStore is admin store and cannot be removed." },
        { status: 403 }
      );
    }

    await prisma.store.delete({ where: { id: storeId } });
    await logAdminAction({
      adminUserId: admin.userId,
      action: "STORE_DELETED",
      targetType: "STORE",
      targetId: storeId,
      details: {
        storeName: existingStore.name,
        storeUsername: existingStore.username,
      },
    });
    return NextResponse.json({ success: true, message: "Store removed." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to remove store." },
      { status: 500 }
    );
  }
}
