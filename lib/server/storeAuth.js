import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export const requireStoreSession = async (requestedUserId = "") => {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      ),
    };
  }

  const askedUserId = normalize(requestedUserId);
  if (askedUserId && askedUserId !== userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: invalid user context." },
        { status: 403 }
      ),
    };
  }

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role || "").toLowerCase();
  if (role !== "seller" && role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: seller access required." },
        { status: 403 }
      ),
    };
  }

  return { userId, user, role };
};

export const findStoreForUser = async (userId) => {
  return (
    (await prisma.store.findFirst({
      where: { userId, status: "approved" },
      orderBy: { updatedAt: "desc" },
    })) ||
    (await prisma.store.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }))
  );
};

