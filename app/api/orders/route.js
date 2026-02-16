import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { sendOrderPlacedEmail } from "@/lib/server/email";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required." },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        user: true,
        address: true,
        store: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch orders." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = normalize(body?.userId);
    const rateLimitResponse = enforceRateLimit({
      request,
      key: "orders:create",
      limit: 5,
      windowMs: 60_000,
      identifier: userId || undefined,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const requestedPaymentMethod = normalize(body?.paymentMethod) || "COD";
    const paymentMethod =
      requestedPaymentMethod === "COD"
        ? "COD"
        : requestedPaymentMethod === "WALLET"
        ? "WALLET"
        : "STRIPE";
    const addressInput = body?.address || null;
    const cartItems = Array.isArray(body?.cartItems) ? body.cartItems : [];
    const coupon = body?.coupon || null;
    const shippingChargeTotal = Number(body?.shippingCharge || 0);
    const requestedWalletDebit = Number(body?.walletDebit || 0);

    if (!userId || !addressInput || !cartItems.length) {
      return NextResponse.json(
        { success: false, message: "Missing required checkout details." },
        { status: 400 }
      );
    }

    const normalizedItems = cartItems
      .map((item) => ({
        productId: normalize(item?.productId),
        quantity: Number(item?.quantity || 0),
        size: normalize(item?.size),
        color: normalize(item?.color),
        variantKey: normalize(item?.variantKey),
      }))
      .filter((item) => item.productId && item.quantity > 0);

    if (!normalizedItems.length) {
      return NextResponse.json(
        { success: false, message: "Cart is empty." },
        { status: 400 }
      );
    }

    const mergedItemsMap = normalizedItems.reduce((acc, item) => {
      const compositeKey = `${item.productId}::${item.size || "-"}::${item.color || "-"}`;
      if (!acc[compositeKey]) {
        acc[compositeKey] = {
          productId: item.productId,
          quantity: 0,
          size: item.size || "",
          color: item.color || "",
          variantKey: item.variantKey || compositeKey,
        };
      }
      acc[compositeKey].quantity += item.quantity;
      return acc;
    }, {});
    const mergedItems = Object.values(mergedItemsMap);
    const productIds = mergedItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (!products.length) {
      return NextResponse.json(
        { success: false, message: "No valid products found in cart." },
        { status: 400 }
      );
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const validItems = mergedItems
      .map((item) => ({ ...item, product: productsById.get(item.productId) }))
      .filter((item) => item.product);

    if (!validItems.length) {
      return NextResponse.json(
        { success: false, message: "No purchasable products found in cart." },
        { status: 400 }
      );
    }

    const unavailable = validItems
      .filter((item) => !item.product.inStock || Number(item.product.stockQty || 0) < item.quantity)
      .map((item) => item.product.name);
    if (unavailable.length) {
      return NextResponse.json(
        {
          success: false,
          message: `Some products are out of stock: ${unavailable.join(", ")}`,
        },
        { status: 409 }
      );
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: normalize(body?.userName) || "User",
        email: normalize(body?.userEmail) || "user@example.com",
        image: normalize(body?.userImage) || "/favicon.ico",
      },
    });

    let addressId = normalize(addressInput?.id);
    if (addressId) {
      const existingAddress = await prisma.address.findFirst({
        where: { id: addressId, userId: user.id },
        select: { id: true },
      });
      if (!existingAddress) {
        addressId = "";
      }
    }

    if (!addressId) {
      const address = await prisma.address.create({
        data: {
          userId: user.id,
          name: normalize(addressInput?.name),
          email: normalize(addressInput?.email),
          street: normalize(addressInput?.street),
          city: normalize(addressInput?.city),
          state: normalize(addressInput?.state),
          zip: normalize(addressInput?.zip),
          country: normalize(addressInput?.country),
          phone: normalize(addressInput?.phone),
        },
      });
      addressId = address.id;
    }

    const itemsByStore = validItems.reduce((acc, item) => {
      const storeId = item.product.storeId;
      if (!acc[storeId]) acc[storeId] = [];
      acc[storeId].push(item);
      return acc;
    }, {});

    const createdOrders = [];
    const storeEntries = Object.entries(itemsByStore);
    await prisma.$transaction(
      async (tx) => {
      let walletDebitRemaining = Number.isFinite(requestedWalletDebit) ? requestedWalletDebit : 0;
      if (walletDebitRemaining > 0) {
        const walletUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { walletBalance: true },
        });
        const available = Number(walletUser?.walletBalance || 0);
        if (walletDebitRemaining > available) {
          throw new Error("Insufficient wallet balance.");
        }
        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: walletDebitRemaining } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            amount: walletDebitRemaining,
            type: "DEBIT",
            reason: "Order payment",
          },
        });
      }
      for (const item of validItems) {
        const reserved = await tx.product.updateMany({
          where: {
            id: item.product.id,
            inStock: true,
            stockQty: { gte: item.quantity },
          },
          data: { stockQty: { decrement: item.quantity } },
        });

        if (reserved.count === 0) {
          throw new Error(`"${item.product.name}" is out of stock.`);
        }

        const current = await tx.product.findUnique({
          where: { id: item.product.id },
          select: { stockQty: true },
        });
        if (!current || current.stockQty <= 0) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { inStock: false, stockQty: 0 },
          });
        }
      }

      for (let index = 0; index < storeEntries.length; index += 1) {
        const [storeId, items] = storeEntries[index];
        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.product.price) * item.quantity,
          0
        );
        const discount = coupon?.discount
          ? (Number(coupon.discount) / 100) * subtotal
          : 0;
        const shippingForThisOrder = index === 0 ? Math.max(0, shippingChargeTotal) : 0;
        let total = Math.max(0, subtotal - discount + shippingForThisOrder);
        if (walletDebitRemaining > 0) {
          const applied = Math.min(walletDebitRemaining, total);
          total = Math.max(0, total - applied);
          walletDebitRemaining -= applied;
        }

        const order = await tx.order.create({
          data: {
            total,
            userId: user.id,
            storeId,
            addressId,
            paymentMethod,
            statusTimeline: [{ status: "ORDER_PLACED", at: new Date().toISOString() }],
            isCouponUsed: Boolean(coupon?.code),
            coupon: coupon || {},
            orderItems: {
              create: items.map((item) => ({
                productId: item.product.id,
                variantKey: item.variantKey || `${item.product.id}::${item.size || "-"}::${item.color || "-"}`,
                size: item.size || "",
                color: item.color || "",
                quantity: item.quantity,
                price: Number(item.product.price),
              })),
            },
          },
          include: {
            user: true,
            address: true,
            store: true,
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        });

        createdOrders.push(order);
      }
    },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    sendOrderPlacedEmail({
      to: user.email,
      orderCount: createdOrders.length,
      total: createdOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Order placed successfully.",
      data: createdOrders,
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("out of stock")) {
      return NextResponse.json({ success: false, message }, { status: 409 });
    }

    return NextResponse.json(
      { success: false, message: error.message || "Failed to place order." },
      { status: 500 }
    );
  }
}
