import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const savedColleges = await prisma.savedCollege.findMany({
      where: { userId },
      include: {
        college: {
          include: {
            courses: true,
            placements: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const colleges = savedColleges.map(sc => ({
      ...sc.college,
      isSaved: true,
    }));

    return NextResponse.json({
      success: true,
      data: colleges,
    });
  } catch (error) {
    console.error("Get saved colleges error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { collegeId } = body;

    if (!collegeId) {
      return NextResponse.json(
        { success: false, error: "collegeId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.savedCollege.findUnique({
      where: {
        userId_collegeId: {
          userId,
          collegeId,
        },
      },
    });

    if (existing) {
      await prisma.savedCollege.delete({
        where: {
          userId_collegeId: {
            userId,
            collegeId,
          },
        },
      });
      return NextResponse.json({
        success: true,
        data: { saved: false },
        message: "Removed from saved colleges.",
      });
    } else {
      await prisma.savedCollege.create({
        data: {
          userId,
          collegeId,
        },
      });
      return NextResponse.json({
        success: true,
        data: { saved: true },
        message: "Saved to your colleges.",
      });
    }
  } catch (error) {
    console.error("Toggle save college error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
