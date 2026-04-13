import { SlotStatus, UserRole } from "@prisma/client";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value: string) {
  return DATE_REGEX.test(value);
}

function getDateRange(date: string) {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T00:00:00`);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

async function getAuthenticatedOwner(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const auth = await verifyAuthToken(token);

  if (auth.role !== UserRole.OWNER) {
    return {
      error: NextResponse.json(
        { success: false, message: "Only court owners can manage schedules." },
        { status: 403 },
      ),
    };
  }

  return { auth };
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const auth = await verifyAuthToken(token);
  return { auth };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    const courtId = request.nextUrl.searchParams.get("courtId")?.trim();
    const date = request.nextUrl.searchParams.get("date")?.trim();

    if (!courtId || !date || !isValidDateInput(date)) {
      return NextResponse.json(
        { success: false, message: "courtId and a valid date are required." },
        { status: 400 },
      );
    }

    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!court) {
      return NextResponse.json(
        { success: false, message: "Court not found." },
        { status: 404 },
      );
    }

    const { dayStart, dayEnd } = getDateRange(date);

    if (authResult.auth.role === UserRole.OWNER) {
      if (court.ownerId !== authResult.auth.sub) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this court" },
          { status: 403 },
        );
      }

      const slots = await prisma.slot.findMany({
        where: {
          courtId,
          startTime: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        orderBy: {
          startTime: "asc",
        },
        include: {
          booking: {
            include: {
              user: {
                select: {
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        slots: slots.map((slot) => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status,
          booking: slot.booking
            ? {
                id: slot.booking.id,
                user: slot.booking.user,
              }
            : null,
        })),
      });
    }

    const slots = await prisma.slot.findMany({
      where: {
        courtId,
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      orderBy: {
        startTime: "asc",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      slots,
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

    console.error("Failed to fetch schedule:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch schedule." },
      { status: 500 },
    );
  }
}

type CreateScheduleBody = {
  courtId?: string;
  date?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedOwner(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    const body = (await request.json()) as CreateScheduleBody;
    const courtId = body.courtId?.trim();
    const date = body.date?.trim();

    if (!courtId || !date || !isValidDateInput(date)) {
      return NextResponse.json(
        { success: false, message: "courtId and a valid date are required." },
        { status: 400 },
      );
    }

    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!court || court.ownerId !== authResult.auth.sub) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this court" },
        { status: 403 },
      );
    }

    const { dayStart, dayEnd } = getDateRange(date);

    const existingSlots = await prisma.slot.findMany({
      where: {
        courtId,
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const existingKeys = new Set(
      existingSlots.map(
        (slot) => `${slot.startTime.toISOString()}|${slot.endTime.toISOString()}`,
      ),
    );

    const slotsArray = [];
    for (let hour = 6; hour < 20; hour += 1) {
      const startTime = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
      const endTime = new Date(`${date}T${String(hour + 1).padStart(2, "0")}:00:00`);
      const slotKey = `${startTime.toISOString()}|${endTime.toISOString()}`;

      if (existingKeys.has(slotKey)) {
        continue;
      }

      slotsArray.push({
        courtId,
        startTime,
        endTime,
        status: SlotStatus.AVAILABLE,
      });
    }

    const result =
      slotsArray.length > 0
        ? await prisma.slot.createMany({
            data: slotsArray,
            skipDuplicates: true,
          })
        : { count: 0 };

    return NextResponse.json({
      success: true,
      message: "Daily slots generated successfully.",
      createdCount: result.count,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JOSEError
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired authentication token." },
        { status: 401 },
      );
    }

    console.error("Failed to generate schedule:", error);

    return NextResponse.json(
      { success: false, message: "Failed to generate schedule." },
      { status: 500 },
    );
  }
}
