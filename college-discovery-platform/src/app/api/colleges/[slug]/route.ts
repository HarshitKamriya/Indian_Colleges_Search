import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const college = await prisma.college.findUnique({
      where: { slug },
      include: {
        courses: true,
        placements: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!college) {
      return NextResponse.json(
        { success: false, error: "College not found" },
        { status: 404 }
      );
    }

    // Determine if user has saved this college
    const session = await auth();
    const userId = session?.user?.id;
    let isSaved = false;
    
    if (userId) {
      const savedRecord = await prisma.savedCollege.findUnique({
        where: {
          userId_collegeId: {
            userId,
            collegeId: college.id,
          },
        },
      });
      isSaved = !!savedRecord;
    }

    // Generate average rating breakdown (5-star distribution)
    const reviewGroups = await prisma.review.groupBy({
      by: ["rating"],
      where: { collegeId: college.id },
      _count: { id: true },
    });

    const ratingDistribution = {
      "5": 0,
      "4": 0,
      "3": 0,
      "2": 0,
      "1": 0,
    };

    reviewGroups.forEach((group) => {
      const ratingKey = group.rating.toString() as keyof typeof ratingDistribution;
      if (ratingKey in ratingDistribution) {
        ratingDistribution[ratingKey] = group._count.id;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...college,
        isSaved,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Get college detail error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
