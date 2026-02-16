import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const requireAdmin = async () => {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      ),
    };
  }

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role || "").toLowerCase();
  if (role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: admin access required." },
        { status: 403 }
      ),
    };
  }

  return { userId, user };
};

