import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dummyStoreData, productDummyData } from "@/assets/assets";
import { requireAdmin } from "@/lib/server/adminAuth";

const toImageUrl = (value) => {
  if (!value) return "/favicon.ico";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.src === "string") return value.src;
  return "/favicon.ico";
};

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const userId = dummyStoreData?.user?.id || dummyStoreData?.userId || "user_seed";
    const userName = dummyStoreData?.user?.name || "ThriftStore";
    const userEmail = dummyStoreData?.user?.email || "seed@example.com";
    const userImage = toImageUrl(dummyStoreData?.user?.image || dummyStoreData?.logo);
    const storeLogo = toImageUrl(dummyStoreData?.logo);

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: userName,
        email: userEmail,
        image: userImage,
      },
      create: {
        id: userId,
        name: userName,
        email: userEmail,
        image: userImage,
      },
    });

    const seededStore = await prisma.store.upsert({
      where: { username: dummyStoreData.username },
      update: {
        userId,
        name: dummyStoreData.name,
        description: dummyStoreData.description,
        address: dummyStoreData.address,
        status: "approved",
        isActive: true,
        logo: storeLogo,
        email: dummyStoreData.email,
        contact: dummyStoreData.contact,
      },
      create: {
        userId,
        name: dummyStoreData.name,
        description: dummyStoreData.description,
        username: dummyStoreData.username,
        address: dummyStoreData.address,
        status: "approved",
        isActive: true,
        logo: storeLogo,
        email: dummyStoreData.email,
        contact: dummyStoreData.contact,
      },
    });

    for (const product of productDummyData) {
      const safeDescription =
        typeof product.description === "string" && product.description.trim()
          ? product.description
          : `${product.name} product`;

      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          brand: product.brand || dummyStoreData.name || "Generic",
          description: safeDescription,
          mrp: Number(product.mrp),
          price: Number(product.price),
          images: Array.isArray(product.images) ? product.images : [],
          category: product.category || "Others",
          inStock: Boolean(product.inStock),
          storeId: seededStore.id,
          createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
          updatedAt: product.updatedAt ? new Date(product.updatedAt) : undefined,
        },
        create: {
          id: product.id,
          name: product.name,
          brand: product.brand || dummyStoreData.name || "Generic",
          description: safeDescription,
          mrp: Number(product.mrp),
          price: Number(product.price),
          images: Array.isArray(product.images) ? product.images : [],
          category: product.category || "Others",
          inStock: Boolean(product.inStock),
          storeId: seededStore.id,
          createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
          updatedAt: product.updatedAt ? new Date(product.updatedAt) : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${productDummyData.length} dummy products into database.`,
      data: { count: productDummyData.length },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to seed dummy products into database.",
      },
      { status: 500 }
    );
  }
}
