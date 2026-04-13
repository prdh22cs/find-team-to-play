import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const auth = await verifyAuthToken(token);

    const bookings = await prisma.booking.findMany({
      where: {
        userId: auth.sub,
      },
      include: {
        court: true,
        slot: true,
      },
      orderBy: {
        slot: {
          startTime: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JOSEError
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired authentication token." },
        { status: 401 },
      );
    }

    console.error("Failed to fetch bookings:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch bookings." },
      { status: 500 },
    );
  }
}
