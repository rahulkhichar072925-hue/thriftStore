import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const parsePlan = (value) => (normalize(value) === "plus" ? "plus" : "basic");
const parseCycle = (value) => (normalize(value) === "yearly" ? "yearly" : "monthly");

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
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ limit: 100 });
    const users = Array.isArray(result) ? result : result?.data || [];

    const data = users.map((user) => {
      const rawPlan = normalize(
        user?.publicMetadata?.membership ||
          user?.publicMetadata?.plan ||
          user?.publicMetadata?.tier ||
          "basic"
      );
      const cycle = parseCycle(user?.publicMetadata?.membershipCycle);
      const expiresAt = user?.publicMetadata?.membershipExpiresAt || null;
      const isPlus = rawPlan === "plus" && isFutureDate(expiresAt);

      return {
        id: user.id,
        name: user.fullName || user.username || "User",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl || "/favicon.ico",
        plan: isPlus ? "plus" : "basic",
        cycle,
        expiresAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch memberships." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const userId = String(body?.userId || "").trim();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required." },
        { status: 400 }
      );
    }

    const plan = parsePlan(body?.plan);
    const cycle = parseCycle(body?.cycle);
    const isPlus = plan === "plus";
    const membershipExpiresAt = isPlus ? addDays(cycle === "yearly" ? 365 : 30) : null;

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
      message: isPlus ? "Plus membership updated." : "Membership downgraded to basic.",
      data: { userId, plan, cycle, expiresAt: membershipExpiresAt },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update membership." },
      { status: 500 }
    );
  }
}
