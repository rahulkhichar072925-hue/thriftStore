import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const parsePlan = (value) => {
  const normalized = normalize(value);
  if (normalized === "plus") return "plus";
  if (normalized === "basic") return "basic";
  return "";
};

const parseCycle = (value) => {
  const normalized = normalize(value);
  if (normalized === "monthly") return "monthly";
  if (normalized === "yearly") return "yearly";
  return "monthly";
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const isFutureDate = (value) => {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const rawMembership = normalize(
      user?.publicMetadata?.membership ||
      user?.publicMetadata?.plan ||
      user?.publicMetadata?.tier ||
      "basic"
    );
    const membershipCycle = parseCycle(user?.publicMetadata?.membershipCycle);
    const membershipExpiresAt = user?.publicMetadata?.membershipExpiresAt || null;
    const isPlusByFlag =
      rawMembership === "plus" ||
      Boolean(user?.publicMetadata?.isPlus || user?.publicMetadata?.plusMember);
    const isPlusActive = isPlusByFlag && isFutureDate(membershipExpiresAt);
    const membership = isPlusActive ? "plus" : "basic";

    return NextResponse.json({
      success: true,
      data: {
        plan: membership,
        cycle: membershipCycle,
        isPlus: membership === "plus",
        expiresAt: membershipExpiresAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch membership." },
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
    const plan = parsePlan(body?.plan);
    const cycle = parseCycle(body?.cycle);
    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Invalid plan. Use basic or plus." },
        { status: 400 }
      );
    }

    const isPlus = plan === "plus";
    if (isPlus) {
      const paymentMethod = normalize(body?.paymentMethod);
      const paymentStatus = normalize(body?.paymentStatus);
      const transactionId = String(body?.transactionId || "").trim();

      if (!paymentMethod || !transactionId || paymentStatus !== "paid") {
        return NextResponse.json(
          { success: false, message: "Payment is required before activating Plus." },
          { status: 402 }
        );
      }
    }

    const membershipExpiresAt = isPlus
      ? addDays(cycle === "yearly" ? 365 : 30)
      : null;

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        membership: plan,
        plan,
        tier: plan,
        membershipCycle: isPlus ? cycle : "monthly",
        membershipExpiresAt,
        isPlus,
        plusMember: isPlus,
      },
    });

    return NextResponse.json({
      success: true,
      message: isPlus ? "Plus membership activated." : "Membership set to basic.",
      data: { plan, cycle, isPlus, expiresAt: membershipExpiresAt },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update membership." },
      { status: 500 }
    );
  }
}
