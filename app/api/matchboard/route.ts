import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateMatchPostBody = {
  postType?: string;
  content?: string;
  location?: string;
  matchTime?: string;
};

const VALID_POST_TYPES = new Set(["SOLO", "INCOMPLETE", "CHALLENGE"]);

export async function GET() {
  try {
    const posts = await prisma.matchPost.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Failed to fetch matchboard posts:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch matchboard posts." },
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
    const body = (await request.json()) as CreateMatchPostBody;

    const postType = body.postType?.trim().toUpperCase();
    const content = body.content?.trim();
    const location = body.location?.trim();
    const matchTime = body.matchTime?.trim();

    if (
      !postType ||
      !VALID_POST_TYPES.has(postType) ||
      !content ||
      !location ||
      !matchTime
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid postType, content, location, and matchTime are required.",
        },
        { status: 400 },
      );
    }

    const post = await prisma.matchPost.create({
      data: {
        postType,
        content,
        location,
        matchTime,
        userId: auth.sub,
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Post created successfully.",
        post,
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

    console.error("Failed to create matchboard post:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create matchboard post." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const auth = await verifyAuthToken(token);
    const id = request.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Post id is required." },
        { status: 400 },
      );
    }

    const post = await prisma.matchPost.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Post not found." },
        { status: 404 },
      );
    }

    if (post.userId !== auth.sub) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own posts." },
        { status: 403 },
      );
    }

    await prisma.matchPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully.",
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

    console.error("Failed to delete matchboard post:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete matchboard post." },
      { status: 500 },
    );
  }
}
