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

    if (auth.role !== "OWNER") {
      return NextResponse.json(
        { success: false, message: "Only owners can access analytics." },
        { status: 403 },
      );
    }

    const courts = await prisma.court.findMany({
      where: {
        ownerId: auth.sub,
      },
      select: {
        id: true,
      },
    });

    const courtIds = courts.map((court) => court.id);

    if (courtIds.length === 0) {
      return NextResponse.json({
        totalBookings: 0,
        totalRevenue: 0,
        peakHours: [],
      });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: {
          in: courtIds,
        },
      },
      include: {
        court: true,
        slot: true,
      },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => {
      return sum + Number(booking.court.pricePerHour);
    }, 0);

    const hourCounts = bookings.reduce<Record<string, number>>((acc, booking) => {
      const hourLabel = booking.slot.startTime.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      acc[hourLabel] = (acc[hourLabel] ?? 0) + 1;
      return acc;
    }, {});

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      totalBookings,
      totalRevenue,
      peakHours,
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

    console.error("Failed to fetch admin analytics:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch analytics." },
      { status: 500 },
    );
  }
}
