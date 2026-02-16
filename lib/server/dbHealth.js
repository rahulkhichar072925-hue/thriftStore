import { prisma } from "@/lib/prisma";

export const DATABASE_DOWN_MESSAGE =
  "Database is temporarily unavailable. Please try again shortly.";

export const isDatabaseConnectionError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "P1001" || code === "P1002" || code === "P1017") return true;
  if (message.includes("can't reach database server")) return true;
  if (message.includes("connection refused")) return true;
  if (message.includes("timed out")) return true;

  return false;
};

export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

