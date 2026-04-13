import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { signAuthToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type VerifyOtpBody = {
  phone?: string;
  otp?: string;
  name?: string;
  role?: string;
};

const VALID_ROLES = new Set<string>(Object.values(UserRole));
const OTP_REGEX = /^\d{6}$/;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.has(role);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOtpBody;

    const phone = body.phone?.trim();
    const otp = body.otp?.trim();
    const name = body.name?.trim();
    const role = body.role?.trim();

    if (!phone || !otp || !name || !role) {
      return NextResponse.json(
        { success: false, message: "phone, otp, name, and role are required." },
        { status: 400 },
      );
    }

    if (!OTP_REGEX.test(otp)) {
      return NextResponse.json(
        { success: false, message: "OTP must be exactly 6 digits." },
        { status: 400 },
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        { success: false, message: "role must be either PLAYER or OWNER." },
        { status: 400 },
      );
    }

    let user = await prisma.user.findUnique({
      where: { phoneNumber: phone },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          phoneNumber: phone,
          role,
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    const token = await signAuthToken({
      sub: user.id,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
      user,
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    console.error("Failed to verify OTP:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "A user with this phone number already exists." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to verify OTP." },
      { status: 500 },
    );
  }
}
