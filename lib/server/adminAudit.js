import { prisma } from "@/lib/prisma";

export const logAdminAction = async ({
  adminUserId,
  action,
  targetType,
  targetId,
  details = {},
}) => {
  try {
    if (!adminUserId || !action || !targetType || !targetId) return;

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: String(adminUserId),
        action: String(action),
        targetType: String(targetType),
        targetId: String(targetId),
        details,
      },
    });
  } catch {
    // Audit log should never block core flow.
  }
};

