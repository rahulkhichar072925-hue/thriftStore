import { NextResponse } from "next/server";
import {
  DATABASE_DOWN_MESSAGE,
  checkDatabaseHealth,
  isDatabaseConnectionError,
} from "@/lib/server/dbHealth";

export async function GET() {
  const result = await checkDatabaseHealth();
  if (result.ok) {
    return NextResponse.json({
      success: true,
      data: { status: "ok", database: "connected" },
    });
  }

  const isDbDown = isDatabaseConnectionError(result.error);
  return NextResponse.json(
    {
      success: false,
      message: isDbDown ? DATABASE_DOWN_MESSAGE : "Database health check failed.",
      data: {
        status: "degraded",
        database: "disconnected",
      },
    },
    { status: isDbDown ? 503 : 500 }
  );
}

