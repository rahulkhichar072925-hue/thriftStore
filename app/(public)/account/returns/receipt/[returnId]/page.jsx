import { auth } from "@clerk/nextjs/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";

export default async function ReturnReceiptPage({ params }) {
  const { userId } = await auth();
  const returnId = params?.returnId;

  if (!userId || !returnId) {
    return (
      <div className="mx-6 min-h-[70vh] flex items-center justify-center text-slate-500">
        Invalid return receipt.
      </div>
    );
  }

  if (!hasPrismaModel("return")) {
    return (
      <div className="mx-6 min-h-[70vh] flex items-center justify-center text-slate-500">
        Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.
      </div>
    );
  }

  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      user: true,
      product: true,
      order: true,
      store: true,
    },
  });

  if (!returnRequest || returnRequest.userId !== userId) {
    return (
      <div className="mx-6 min-h-[70vh] flex items-center justify-center text-slate-500">
        Return receipt not found.
      </div>
    );
  }

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-3xl mx-auto py-10 text-slate-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">Return Receipt</h1>
          <div className="flex gap-2">
            <a
              href={`/api/returns/${returnRequest.id}/receipt`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Print
            </button>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 p-5 space-y-3">
          <p><strong>Return ID:</strong> {returnRequest.id}</p>
          <p><strong>Order ID:</strong> {returnRequest.orderId}</p>
          <p><strong>Product:</strong> {returnRequest.product?.name}</p>
          <p><strong>Store:</strong> {returnRequest.store?.name}</p>
          <p><strong>Status:</strong> {returnRequest.status}</p>
          <p><strong>Reason:</strong> {returnRequest.reason}</p>
          <p><strong>Description:</strong> {returnRequest.description}</p>
          {returnRequest.refundAmount ? (
            <p><strong>Refund:</strong> Rs{Number(returnRequest.refundAmount).toFixed(2)}</p>
          ) : null}
          {returnRequest.refundedAt ? (
            <p><strong>Refunded At:</strong> {new Date(returnRequest.refundedAt).toLocaleString()}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
