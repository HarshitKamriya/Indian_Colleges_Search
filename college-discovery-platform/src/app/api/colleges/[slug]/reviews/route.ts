import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    const sortBy = searchParams.get("sortBy") || "recent";

    const college = await prisma.college.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!college) {
      return NextResponse.json(
        { success: false, error: "College not found" },
        { status: 404 }
      );
    }

    let orderByClause: any = { createdAt: "desc" };
    if (sortBy === "rating_desc") {
      orderByClause = { rating: "desc" };
    } else if (sortBy === "rating_asc") {
      orderByClause = { rating: "asc" };
    }

    const reviews = await prisma.review.findMany({
      where: { collegeId: college.id },
      take: limit,
      skip,
      orderBy: orderByClause,
    });

    const totalReviews = await prisma.review.count({
      where: { collegeId: college.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalCount: totalReviews,
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
