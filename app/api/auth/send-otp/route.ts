import { randomInt } from "node:crypto";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendOtpBody = {
  phone?: string;
  name?: string;
  role?: string;
};

const VALID_ROLES = new Set<string>(Object.values(UserRole));

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.has(role);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpBody;

    const phone = body.phone?.trim();
    const name = body.name?.trim();
    const role = body.role?.trim();

    if (!phone || !name || !role) {
      return NextResponse.json(
        { success: false, message: "phone, name, and role are required." },
        { status: 400 },
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        { success: false, message: "role must be either PLAYER or OWNER." },
        { status: 400 },
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    console.log(`[DEV OTP] ${phone}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    console.error("Failed to send OTP:", error);

    return NextResponse.json(
      { success: false, message: "Failed to send OTP." },
      { status: 500 },
    );
  }
}
