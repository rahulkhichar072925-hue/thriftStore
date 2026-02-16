import { NextResponse } from "next/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { findStoreForUser, requireStoreSession } from "@/lib/server/storeAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));
    const session = await requireStoreSession(userId);
    if (session.error) return session.error;

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const store = await findStoreForUser(session.userId);
    if (!store) {
      return NextResponse.json({ success: true, data: [] });
    }

    const returns = await prisma.return.findMany({
      where: { storeId: store.id },
      include: {
        user: true,
        product: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch returns." },
      { status: 500 }
    );
  }
}
