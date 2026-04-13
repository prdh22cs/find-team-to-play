import { UserRole } from "@prisma/client";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

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

    if (auth.role !== UserRole.OWNER) {
      return NextResponse.json(
        { success: false, message: "Only court owners can view this resource." },
        { status: 403 },
      );
    }

    const courts = await prisma.court.findMany({
      where: {
        ownerId: auth.sub,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        location: true,
        pricePerHour: true,
      },
    });

    return NextResponse.json({
      success: true,
      courts,
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

    console.error("Failed to fetch owner courts:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch owner courts." },
      { status: 500 },
    );
  }
}
