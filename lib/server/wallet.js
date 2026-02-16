import { prisma } from "@/lib/prisma";

export const creditWallet = async ({ userId, amount, reason = "credit" }) => {
  const value = Number(amount || 0);
  if (!userId || !Number.isFinite(value) || value <= 0) return null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      walletBalance: { increment: value },
    },
  });

  return prisma.walletTransaction.create({
    data: {
      userId,
      amount: value,
      type: "CREDIT",
      reason,
    },
  });
};
