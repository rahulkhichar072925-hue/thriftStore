import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const getFromEmail = () =>
  normalize(process.env.NOTIFICATION_FROM_EMAIL) ||
  normalize(process.env.NEWSLETTER_FROM_EMAIL) ||
  normalize(process.env.RESEND_FROM_EMAIL) ||
  "onboarding@resend.dev";

export const sendEmail = async ({ to, subject, html, eventType: eventTypeInput }) => {
  const apiKey = normalize(process.env.RESEND_API_KEY || process.env.RESEND_KEY);
  const toEmail = normalize(to);
  const emailSubject = normalize(subject);
  const bodyHtml = normalize(html);

  const eventType = normalize(eventTypeInput) || "GENERAL";

  const writeLog = async ({ status, error = "" }) => {
    if (!prisma.emailLog || typeof prisma.emailLog.create !== "function") return;
    try {
      await prisma.emailLog.create({
        data: {
          recipient: toEmail || "unknown",
          subject: emailSubject || "No Subject",
          eventType,
          status,
          error: String(error || ""),
        },
      });
    } catch {
      // Email logging should never break business flow.
    }
  };

  if (!apiKey || !toEmail || !emailSubject || !bodyHtml) {
    await writeLog({ status: "SKIPPED", error: "missing_required_fields" });
    return { sent: false, reason: "missing_required_fields" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to: [toEmail],
        subject: emailSubject,
        html: bodyHtml,
      }),
    });

    if (!response.ok) {
      await writeLog({ status: "FAILED", error: "provider_error" });
      return { sent: false, reason: "provider_error" };
    }
    await writeLog({ status: "SENT" });
    return { sent: true };
  } catch {
    await writeLog({ status: "FAILED", error: "network_error" });
    return { sent: false, reason: "network_error" };
  }
};

export const sendStoreRequestStatusEmail = async ({ to, storeName, status }) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const statusLabel =
    normalizedStatus === "approved"
      ? "Approved"
      : normalizedStatus === "rejected"
      ? "Rejected"
      : "Updated";

  return sendEmail({
    to,
    subject: `Store Request ${statusLabel} - ${storeName || "ThriftStore"}`,
    eventType: "STORE_REQUEST_STATUS",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Store Request ${statusLabel}</h2>
        <p>Your store <strong>${storeName || "Your Store"}</strong> request is now <strong>${statusLabel}</strong>.</p>
        <p>Please log in to ThriftStore for next steps.</p>
      </div>
    `,
  });
};

export const sendOrderPlacedEmail = async ({ to, orderCount, total }) =>
  sendEmail({
    to,
    subject: "Order Confirmed - ThriftStore",
    eventType: "ORDER_PLACED",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Order Placed Successfully</h2>
        <p>Your order has been placed.</p>
        <p><strong>Orders:</strong> ${Number(orderCount || 0)}<br/><strong>Total:</strong> Rs${Number(total || 0).toFixed(2)}</p>
        <p>You can track status in My Orders.</p>
      </div>
    `,
  });

export const sendOrderStatusEmail = async ({ to, orderId, status }) =>
  sendEmail({
    to,
    subject: `Order Status Updated - ${status}`,
    eventType: "ORDER_STATUS_UPDATED",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Order Status Updated</h2>
        <p>Your order <strong>${String(orderId || "").slice(0, 12)}</strong> status is now <strong>${status}</strong>.</p>
      </div>
    `,
  });

export const sendComplaintStatusEmail = async ({ to, complaintId, status, note }) =>
  sendEmail({
    to,
    subject: `Complaint ${status} - Update from ThriftStore`,
    eventType: "COMPLAINT_STATUS_UPDATED",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Complaint Update</h2>
        <p>Your complaint <strong>${String(complaintId || "").slice(0, 12)}</strong> is now <strong>${status}</strong>.</p>
        ${note ? `<p><strong>Admin note:</strong> ${note}</p>` : ""}
      </div>
    `,
  });

export const sendReturnStatusEmail = async ({
  to,
  returnId,
  status,
  note,
  pickupDate,
  pickupWindow,
  pickupAddress,
  refundAmount,
  receiptUrl,
}) =>
  sendEmail({
    to,
    subject: `Return ${status} - Update from ThriftStore`,
    eventType: "RETURN_STATUS_UPDATED",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Return Update</h2>
        <p>Your return <strong>${String(returnId || "").slice(0, 12)}</strong> is now <strong>${status}</strong>.</p>
        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
        ${pickupDate ? `<p><strong>Pickup:</strong> ${new Date(pickupDate).toLocaleString()}</p>` : ""}
        ${pickupWindow ? `<p><strong>Pickup Window:</strong> ${pickupWindow}</p>` : ""}
        ${pickupAddress ? `<p><strong>Pickup Address:</strong> ${pickupAddress}</p>` : ""}
        ${refundAmount ? `<p><strong>Refund:</strong> Rs${Number(refundAmount).toFixed(2)}</p>` : ""}
        ${receiptUrl ? `<p><strong>Receipt:</strong> <a href="${receiptUrl}">View Receipt</a></p>` : ""}
      </div>
    `,
  });
