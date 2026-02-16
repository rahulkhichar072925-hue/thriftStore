import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(_request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const returnId = normalize(params?.id);
    if (!returnId) {
      return NextResponse.json(
        { success: false, message: "return id is required." },
        { status: 400 }
      );
    }

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
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
      return NextResponse.json(
        { success: false, message: "Return receipt not found." },
        { status: 404 }
      );
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width } = page.getSize();

    const drawText = (text, x, y, size = 12, boldText = false) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: boldText ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
    };

    let y = 780;
    drawText("ThriftStore Return Receipt", 40, y, 18, true);
    y -= 30;
    drawText(`Return ID: ${returnRequest.id}`, 40, y);
    y -= 18;
    drawText(`Order ID: ${returnRequest.orderId}`, 40, y);
    y -= 18;
    drawText(`Product: ${returnRequest.product?.name || "-"}`, 40, y);
    y -= 18;
    drawText(`Store: ${returnRequest.store?.name || "-"}`, 40, y);
    y -= 18;
    drawText(`Status: ${returnRequest.status}`, 40, y);
    y -= 18;
    drawText(`Reason: ${returnRequest.reason}`, 40, y);
    y -= 18;
    drawText(`Description: ${returnRequest.description}`, 40, y);
    y -= 18;
    if (returnRequest.refundAmount) {
      drawText(`Refund: Rs${Number(returnRequest.refundAmount).toFixed(2)}`, 40, y);
      y -= 18;
    }
    if (returnRequest.refundedAt) {
      drawText(`Refunded At: ${new Date(returnRequest.refundedAt).toLocaleString()}`, 40, y);
      y -= 18;
    }

    drawText(`Generated: ${new Date().toLocaleString()}`, 40, 60, 10);
    drawText("Thank you for shopping with ThriftStore.", 40, 40, 10, true);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="return-${returnId}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate receipt." },
      { status: 500 }
    );
  }
}
