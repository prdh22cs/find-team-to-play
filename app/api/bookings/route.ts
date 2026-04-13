import { PaymentStatus, Prisma, SlotStatus, UserRole } from "@prisma/client";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBookingBody = {
  slotId?: string;
  courtId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const auth = await verifyAuthToken(token);

    if (auth.role !== UserRole.PLAYER) {
      return NextResponse.json(
        { success: false, message: "Only players can book slots." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateBookingBody;
    const slotId = body.slotId?.trim();
    const courtId = body.courtId?.trim();

    if (!slotId || !courtId) {
      return NextResponse.json(
        { success: false, message: "slotId and courtId are required." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const court = await tx.court.findUnique({
        where: { id: courtId },
        select: { id: true, pricePerHour: true },
      });

      if (!court) {
        throw new Error("COURT_NOT_FOUND");
      }

      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        select: { id: true, courtId: true, status: true },
      });

      if (!slot || slot.courtId !== courtId) {
        throw new Error("SLOT_NOT_FOUND");
      }

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      const updateResult = await tx.slot.updateMany({
        where: {
          id: slotId,
          courtId,
          status: SlotStatus.AVAILABLE,
        },
        data: {
          status: SlotStatus.BOOKED,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      await tx.booking.create({
        data: {
          userId: auth.sub,
          courtId,
          slotId,
          amount: new Prisma.Decimal(court.pricePerHour),
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Slot booked successfully!",
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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { success: false, message: "This slot has already been booked." },
          { status: 409 },
        );
      }
    }

    if (error instanceof Error) {
      if (error.message === "COURT_NOT_FOUND" || error.message === "SLOT_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Court or slot not found." },
          { status: 404 },
        );
      }

      if (error.message === "SLOT_UNAVAILABLE") {
        return NextResponse.json(
          { success: false, message: "This slot is no longer available." },
          { status: 409 },
        );
      }
    }

    console.error("Failed to create booking:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create booking." },
      { status: 500 },
    );
  }
}
