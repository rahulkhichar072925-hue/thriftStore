import { NextResponse } from "next/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

export async function GET() {
  try {
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

    const returns = await prisma.return.findMany({
      include: {
        user: true,
        product: true,
        store: true,
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
