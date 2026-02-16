import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_CONTACT = {
  email: "thriftstorehead@gmail.com",
  phone: "+910000000000",
  address: "Sanjivani Agro Agency, 332001",
  mapQuery: "Sanjivani Agro Agency 332001",
};

const normalizePhoneHref = (value) => {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  return digits || FALLBACK_CONTACT.phone;
};

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        email: true,
        contact: true,
        address: true,
        name: true,
        username: true,
      },
    });

    const thriftStore =
      stores.find((store) => (store?.name || "").trim().toLowerCase() === "thriftstore") ||
      stores.find((store) => (store?.username || "").trim().toLowerCase() === "thriftstore");

    const email = thriftStore?.email || FALLBACK_CONTACT.email;
    const phone = normalizePhoneHref(thriftStore?.contact);
    const address = thriftStore?.address || FALLBACK_CONTACT.address;

    return NextResponse.json({
      success: true,
      data: {
        email,
        phone,
        address,
        mapQuery: address || FALLBACK_CONTACT.mapQuery,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: FALLBACK_CONTACT,
    });
  }
}
