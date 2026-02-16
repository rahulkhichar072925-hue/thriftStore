import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(_request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const returnId = normalize(params?.id);
    if (!returnId) {
      return NextResponse.json(
        { success: false, message: "return id is required." },
        { status: 400 }
      );
    }

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const returnRequest = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        user: true,
        product: true,
        order: true,
        store: true,
      },
    });

    if (!returnRequest || returnRequest.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Return not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: returnRequest });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch return." },
      { status: 500 }
    );
  }
}
