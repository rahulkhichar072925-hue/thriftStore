import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/server/rateLimit";

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendNewsletterWelcomeEmail = async (toEmail) => {
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const fromEmail =
    process.env.NEWSLETTER_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "onboarding@resend.dev";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">Welcome to ThriftStore Newsletter</h2>
      <p style="margin:0 0 10px">Thanks for subscribing with <strong>${toEmail}</strong>.</p>
      <p style="margin:0 0 10px">You will receive latest offers, new arrivals, and insider updates.</p>
      <p style="margin:16px 0 0;color:#64748b">- ThriftStore Team</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: "Welcome to ThriftStore Newsletter",
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      sent: false,
      reason: payload?.message || "send_failed",
    };
  }

  return { sent: true };
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalize(body?.email);

    const rateLimitResponse = enforceRateLimit({
      request,
      key: "newsletter:subscribe",
      limit: 3,
      windowMs: 60_000,
      identifier: email || undefined,
    });
    if (rateLimitResponse) return rateLimitResponse;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address." },
        { status: 400 }
      );
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "This email is already subscribed.",
        data: { alreadySubscribed: true, emailSent: false },
      });
    }

    await prisma.newsletterSubscriber.create({
      data: { email },
    });

    const emailResult = await sendNewsletterWelcomeEmail(email);

    return NextResponse.json({
      success: true,
      message: emailResult.sent
        ? "Subscribed successfully. Confirmation email sent."
        : "Subscribed successfully.",
      data: { alreadySubscribed: false, emailSent: emailResult.sent },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to subscribe." },
      { status: 500 }
    );
  }
}
