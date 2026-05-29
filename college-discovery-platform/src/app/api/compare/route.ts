import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Support slugs[] query parameters and comma-separated slugs query
    const slugsArray = searchParams.getAll("slugs");
    const slugsArrayBrackets = searchParams.getAll("slugs[]");
    const slugsString = searchParams.get("slugs") || "";
    
    const allSlugs = [
      ...slugsArray,
      ...slugsArrayBrackets,
      ...(slugsString.includes(",") ? slugsString.split(",") : [slugsString])
    ]
      .map(s => s.trim())
      .filter(Boolean);

    if (allSlugs.length < 2 || allSlugs.length > 3) {
      return NextResponse.json(
        {
          success: false,
          error: "You must select between 2 and 3 colleges for comparison.",
        },
        { status: 400 }
      );
    }

    const colleges = await prisma.college.findMany({
      where: {
        slug: { in: allSlugs },
      },
      include: {
        courses: true,
        placements: true,
      },
    });

    // Reorder colleges to match the order of slugs requested
    colleges.sort((a, b) => allSlugs.indexOf(a.slug) - allSlugs.indexOf(b.slug));

    // Resolve user saved items status
    const session = await auth();
    const userId = session?.user?.id;
    let savedIds = new Set<string>();

    if (userId && colleges.length > 0) {
      const savedColleges = await prisma.savedCollege.findMany({
        where: {
          userId,
          collegeId: { in: colleges.map(c => c.id) },
        },
        select: { collegeId: true },
      });
      savedIds = new Set(savedColleges.map(sc => sc.collegeId));
    }

    const result = colleges.map(c => ({
      ...c,
      isSaved: savedIds.has(c.id),
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Comparison endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
