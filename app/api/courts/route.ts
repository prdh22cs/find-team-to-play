import { Prisma, UserRole } from "@prisma/client";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

type CreateCourtBody = {
  name?: string;
  location?: string;
  pricePerHour?: number | string;
};

export async function GET(request: NextRequest) {
  try {
    const filter = request.nextUrl.searchParams.get("filter");
    const city = request.nextUrl.searchParams.get("city")?.trim();
    const where: {
      ownerId?: string;
      location?: {
        contains: string;
        mode: "insensitive";
      };
    } = {};

    if (filter === "my-courts") {
      const token = request.cookies.get("auth_token")?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, message: "Authentication required." },
          { status: 401 },
        );
      }

      const auth = await verifyAuthToken(token);
      where.ownerId = auth.sub;
    }

    if (city && city !== "All") {
      where.location = {
        contains: city,
        mode: "insensitive",
      };
    }

    const courts = await prisma.court.findMany({
      where,
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
    console.error("Failed to fetch courts:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch courts." },
      { status: 500 },
    );
  }
}

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

    if (auth.role !== UserRole.OWNER) {
      return NextResponse.json(
        { success: false, message: "Only court owners can create courts." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateCourtBody;
    const name = body.name?.trim();
    const location = body.location?.trim();
    const pricePerHour = Number(body.pricePerHour);

    if (!name || !location || Number.isNaN(pricePerHour) || pricePerHour <= 0) {
      return NextResponse.json(
        { success: false, message: "name, location, and valid pricePerHour are required." },
        { status: 400 },
      );
    }

    const court = await prisma.court.create({
      data: {
        ownerId: auth.sub,
        name,
        location,
        pricePerHour: new Prisma.Decimal(pricePerHour),
        images: [],
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        location: true,
        pricePerHour: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Court created successfully.",
        court,
      },
      { status: 201 },
    );
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

    console.error("Failed to create court:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create court." },
      { status: 500 },
    );
  }
}
