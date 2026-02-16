import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const ADMIN_STORE_NAME = "ThriftStore";
const ADMIN_STORE_USERNAME = "thriftstore";
const isAdminStore = (store) => {
  const name = normalize(store?.name).toLowerCase();
  const username = normalize(store?.username).toLowerCase();
  return name === ADMIN_STORE_NAME.toLowerCase() || username === ADMIN_STORE_USERNAME;
};
const splitWords = (value) =>
  normalize(value)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
const hashText = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};
const shouldAutoGenerateLogo = (logo) => {
  const current = normalize(logo).toLowerCase();
  return !current || current === "/favicon.ico" || current.includes("/server/assets/");
};
const buildAutoLogo = (storeName) => {
  const words = splitWords(storeName);
  const firstWord = words[0] || "Store";
  const hash = hashText(firstWord + words.join(""));

  let secondToken = firstWord;
  if (words.length > 1) {
    const index = (hash % (words.length - 1)) + 1;
    secondToken = words[index] || words[1];
  } else {
    const letters = firstWord.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 2) {
      const index = Math.max(1, hash % letters.length);
      secondToken = letters[index];
    }
  }

  const firstLetter = firstWord.charAt(0).toUpperCase() || "S";
  const secondLetter = (secondToken.charAt(0) || firstLetter).toUpperCase();
  const initials = `${firstLetter}${secondLetter}`;
  const hueA = hash % 360;
  const hueB = (hueA + 45) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='hsl(${hueA} 78% 50%)'/><stop offset='100%' stop-color='hsl(${hueB} 76% 40%)'/></linearGradient></defs><rect width='240' height='240' rx='120' fill='url(#g)'/><circle cx='120' cy='120' r='73' fill='rgba(255,255,255,0.18)'/><text x='120' y='138' text-anchor='middle' fill='white' font-size='72' font-family='Arial, Helvetica, sans-serif' font-weight='700'>${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const makeUsername = (fullName) =>
  normalize(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "seller";

export async function GET(request) {
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: sign in required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));
    if (!userId) {
      const { error } = await requireAdmin();
      if (error) return error;
    } else if (sessionUserId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: cannot access another user's store request." },
        { status: 403 }
      );
    }

    let stores = await prisma.store.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    if (!userId) {
      const targets = stores.filter(
        (store) =>
          store?.status === "approved" &&
          Boolean(store?.isActive) &&
          !isAdminStore(store) &&
          shouldAutoGenerateLogo(store?.logo)
      );

      if (targets.length > 0) {
        await Promise.all(
          targets.map((store) =>
            prisma.store.update({
              where: { id: store.id },
              data: { logo: buildAutoLogo(store.name) },
            })
          )
        );

        stores = await prisma.store.findMany({
          where: userId ? { userId } : undefined,
          orderBy: { createdAt: "desc" },
        });
      }
    }

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch store requests." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: sign in required." },
      { status: 401 }
    );
  }

  try {
    const clerkUser = await currentUser();
    const role = String(clerkUser?.publicMetadata?.role || "").toLowerCase();
    const isAdmin = role === "admin";

    const body = await request.json();

    const userId = normalize(body.userId);
    const fullName = normalize(body.fullName);
    const storeNameInput = normalize(body.storeName);
    const description = normalize(body.description);
    const email = normalize(body.email);
    const contact = normalize(body.contact);
    const address = normalize(body.address);
    const requestedLogo = normalize(body.logo);
    const storeName = isAdmin ? ADMIN_STORE_NAME : storeNameInput;
    const logo = shouldAutoGenerateLogo(requestedLogo)
      ? buildAutoLogo(storeName)
      : requestedLogo;

    if (!userId || !fullName || !storeNameInput || !description || !email || !contact || !address) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    if (sessionUserId !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: invalid user id for this session." },
        { status: 403 }
      );
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: fullName,
        email,
        image: logo,
      },
      create: {
        id: userId,
        name: fullName,
        email,
        image: logo,
      },
    });

    const existingByUser = await prisma.store.findUnique({ where: { userId } });
    if (existingByUser && existingByUser.status !== "rejected" && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Your request is already sent to the admin." },
        { status: 409 }
      );
    }

    const duplicateStoreName = await prisma.store.findFirst({
      where: {
        name: { equals: storeName, mode: "insensitive" },
        status: { not: "rejected" },
        userId: { not: userId },
      },
    });

    if (duplicateStoreName) {
      return NextResponse.json(
        { success: false, message: "Store name already exists. Try a different store name." },
        { status: 409 }
      );
    }

    let username = isAdmin ? ADMIN_STORE_USERNAME : makeUsername(fullName);
    const usernameOwner = await prisma.store.findUnique({ where: { username } });
    if (usernameOwner && usernameOwner.userId !== userId) {
      if (isAdmin) {
        return NextResponse.json(
          { success: false, message: "thriftstore username is already used by another account." },
          { status: 409 }
        );
      }
      username = `${username}-${Date.now().toString().slice(-4)}`;
    }

    const status = isAdmin ? "approved" : "pending";
    const isActive = isAdmin;

    let store;
    if (existingByUser) {
      store = await prisma.store.update({
        where: { userId },
        data: {
          name: storeName,
          username,
          description,
          email,
          contact,
          address,
          logo,
          status,
          isActive,
        },
      });
    } else {
      store = await prisma.store.create({
        data: {
          userId,
          name: storeName,
          username,
          description,
          email,
          contact,
          address,
          logo,
          status,
          isActive,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isAdmin ? "Admin store synced as ThriftStore." : "Store request submitted.",
      data: store,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create store request." },
      { status: 500 }
    );
  }
}
