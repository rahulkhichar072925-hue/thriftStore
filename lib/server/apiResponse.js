import { NextResponse } from "next/server";
import {
  DATABASE_DOWN_MESSAGE,
  isDatabaseConnectionError,
} from "@/lib/server/dbHealth";

export const badRequest = (message) =>
  NextResponse.json({ success: false, message }, { status: 400 });

export const unauthorized = (message = "Unauthorized.") =>
  NextResponse.json({ success: false, message }, { status: 401 });

export const forbidden = (message = "Forbidden.") =>
  NextResponse.json({ success: false, message }, { status: 403 });

export const notFound = (message = "Not found.") =>
  NextResponse.json({ success: false, message }, { status: 404 });

export const ok = (data, message) =>
  NextResponse.json(
    message ? { success: true, message, data } : { success: true, data }
  );

const mapPrismaError = (error) => {
  const code = String(error?.code || "");

  if (code === "P1001") {
    return {
      status: 503,
      message: DATABASE_DOWN_MESSAGE,
    };
  }

  if (code === "P2002") {
    return { status: 409, message: "A record with this value already exists." };
  }

  if (code === "P2025") {
    return { status: 404, message: "Requested record was not found." };
  }

  return null;
};

export const serverError = (error, fallbackMessage) => {
  const prismaMapped = mapPrismaError(error);
  if (prismaMapped) {
    return NextResponse.json(
      { success: false, message: prismaMapped.message },
      { status: prismaMapped.status }
    );
  }

  if (isDatabaseConnectionError(error)) {
    return NextResponse.json(
      { success: false, message: DATABASE_DOWN_MESSAGE },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { success: false, message: fallbackMessage || "Something went wrong." },
    { status: 500 }
  );
};
