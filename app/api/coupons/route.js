import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { couponDummyData } from "@/assets/assets";
import { requireAdmin } from "@/lib/server/adminAuth";
import { logAdminAction } from "@/lib/server/adminAudit";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return fallback;
};

const toCouponPayload = (coupon) => ({
  code: coupon.code,
  description: coupon.description,
  discount: Number(coupon.discount),
  forNewUser: Boolean(coupon.forNewUser),
  forMember: Boolean(coupon.forMember),
  isPublic: Boolean(coupon.isPublic),
  expiresAt: coupon.expiresAt,
  createdAt: coupon.createdAt,
});

const seedCouponsIfEmpty = async () => {
  const count = await prisma.coupon.count();
  if (count > 0) return;

  await prisma.coupon.createMany({
    data: couponDummyData.map((coupon) => ({
      code: normalize(coupon.code).toUpperCase(),
      description: normalize(coupon.description),
      discount: Number(coupon.discount),
      forNewUser: Boolean(coupon.forNewUser),
      forMember: Boolean(coupon.forMember),
      isPublic: Boolean(coupon.isPublic),
      expiresAt: new Date(coupon.expiresAt),
      createdAt: coupon.createdAt ? new Date(coupon.createdAt) : undefined,
    })),
    skipDuplicates: true,
  });
};

export async function GET(request) {
  try {
    await seedCouponsIfEmpty();

    const { searchParams } = new URL(request.url);
    const onlyPublic = parseBoolean(searchParams.get("public"), false);
    const onlyActive = parseBoolean(searchParams.get("active"), true);

    const now = new Date();
    const where = {
      ...(onlyPublic ? { isPublic: true } : {}),
      ...(onlyActive ? { expiresAt: { gte: now } } : {}),
    };

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: coupons.map(toCouponPayload),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch coupons." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();

    const code = normalize(body.code).toUpperCase();
    const description = normalize(body.description);
    const discount = Number(body.discount);
    const forNewUser = Boolean(body.forNewUser);
    const forMember = Boolean(body.forMember);
    const isPublic = Boolean(body.isPublic);
    const expiresAtRaw = body.expiresAt;

    if (!code || !description || Number.isNaN(discount)) {
      return NextResponse.json(
        { success: false, message: "Code, description and discount are required." },
        { status: 400 }
      );
    }

    if (discount <= 0 || discount > 100) {
      return NextResponse.json(
        { success: false, message: "Discount must be between 1 and 100." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon expiry date." },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discount,
        forNewUser,
        forMember,
        isPublic,
        expiresAt,
      },
    });

    await logAdminAction({
      adminUserId: admin.userId,
      action: "COUPON_CREATED",
      targetType: "COUPON",
      targetId: coupon.code,
      details: {
        discount: coupon.discount,
        expiresAt: coupon.expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon added.",
      data: toCouponPayload(coupon),
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Coupon code already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Failed to create coupon." },
      { status: 500 }
    );
  }
}
