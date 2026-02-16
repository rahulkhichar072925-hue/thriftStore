import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const ADMIN_STORE_NAME = "ThriftStore";
const ADMIN_STORE_USERNAME = "thriftstore";

export async function GET(request) {
  try {
    const { userId: sessionUserId } = await auth();
    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    const role = String(clerkUser?.publicMetadata?.role || "").toLowerCase();

    const { searchParams } = new URL(request.url);
    const requestedUserId = normalize(searchParams.get("userId"));

    if (requestedUserId && requestedUserId !== sessionUserId && role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden: invalid user context." },
        { status: 403 }
      );
    }

    let ownStore = await prisma.store.findFirst({
      where: { userId: sessionUserId },
      orderBy: { updatedAt: "desc" },
    });

    if (role === "admin" && ownStore) {
      const currentName = normalize(ownStore.name).toLowerCase();
      const currentUsername = normalize(ownStore.username).toLowerCase();
      const needsCanonicalIdentity =
        currentName !== ADMIN_STORE_NAME.toLowerCase() ||
        currentUsername !== ADMIN_STORE_USERNAME ||
        ownStore.status !== "approved" ||
        !ownStore.isActive;

      if (needsCanonicalIdentity) {
        const usernameOwner = await prisma.store.findUnique({
          where: { username: ADMIN_STORE_USERNAME },
        });

        const updateData =
          usernameOwner && usernameOwner.id !== ownStore.id
            ? {
                name: ADMIN_STORE_NAME,
                status: "approved",
                isActive: true,
              }
            : {
                name: ADMIN_STORE_NAME,
                username: ADMIN_STORE_USERNAME,
                status: "approved",
                isActive: true,
              };

        ownStore = await prisma.store.update({
          where: { id: ownStore.id },
          data: updateData,
        });
      }
    }

    const ownStoreAuthorized = Boolean(ownStore && ownStore.status === "approved" && ownStore.isActive);

    if (ownStoreAuthorized) {
      return NextResponse.json({
        success: true,
        authorized: true,
        data: ownStore,
      });
    }

    if (role === "admin") {
      const adminStore = await prisma.store.findFirst({
        where: {
          status: "approved",
          isActive: true,
          OR: [
            { username: { equals: "thriftstore", mode: "insensitive" } },
            { name: { equals: "thriftstore", mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

      if (adminStore) {
        return NextResponse.json({
          success: true,
          authorized: true,
          data: adminStore,
        });
      }
    }

    return NextResponse.json({
      success: true,
      authorized: false,
      data: ownStore || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch seller store." },
      { status: 500 }
    );
  }
}
