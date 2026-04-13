import { jwtVerify, SignJWT } from "jose";
import { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
};

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey);

  if (typeof payload.sub !== "string") {
    throw new Error("Invalid auth token subject.");
  }

  if (payload.role !== UserRole.PLAYER && payload.role !== UserRole.OWNER) {
    throw new Error("Invalid auth token role.");
  }

  return {
    sub: payload.sub,
    role: payload.role,
  };
}
