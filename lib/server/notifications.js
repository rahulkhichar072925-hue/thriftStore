import { prisma } from "@/lib/prisma";

export const createNotification = async ({ userId, title, body, type = "general", meta = {} }) => {
  if (!userId || !title || !body) return null;

  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        meta,
      },
    });
  } catch {
    return null;
  }
};
