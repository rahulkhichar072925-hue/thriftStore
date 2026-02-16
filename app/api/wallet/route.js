import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/server/wallet";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    const txns = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: Number(user?.walletBalance || 0),
        transactions: txns,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch wallet." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amount = Number(body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount must be greater than 0." },
        { status: 400 }
      );
    }

    await creditWallet({ userId, amount, reason: "Top up" });

    return NextResponse.json({
      success: true,
      message: "Wallet credited.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update wallet." },
      { status: 500 }
    );
  }
}
