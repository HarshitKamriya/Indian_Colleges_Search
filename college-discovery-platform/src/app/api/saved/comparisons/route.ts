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

    const comparisons = await prisma.savedComparison.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: comparisons,
    });
  } catch (error) {
    console.error("Get saved comparisons error:", error);
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
    const { collegeSlugs, name } = body;

    if (!collegeSlugs || !Array.isArray(collegeSlugs) || collegeSlugs.length < 2) {
      return NextResponse.json(
        { success: false, error: "At least 2 college slugs are required to save a comparison" },
        { status: 400 }
      );
    }

    let comparisonName = name;
    if (!comparisonName) {
      const colleges = await prisma.college.findMany({
        where: { slug: { in: collegeSlugs } },
        select: { name: true },
      });
      
      comparisonName = colleges
        .map(c => {
          let n = c.name;
          n = n.replace("Indian Institute of Technology", "IIT");
          n = n.replace("National Institute of Technology", "NIT");
          n = n.replace("All India Institute of Medical Sciences", "AIIMS");
          n = n.replace("Indian Institute of Management", "IIM");
          return n;
        })
        .join(" vs ");
    }

    const comparison = await prisma.savedComparison.create({
      data: {
        userId,
        name: comparisonName || "Comparison",
        collegeSlugs,
      },
    });

    return NextResponse.json({
      success: true,
      data: comparison,
      message: "Comparison saved successfully.",
    });
  } catch (error) {
    console.error("Save comparison error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
