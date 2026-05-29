import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import type { SortOption } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse Query Parameters
    const search = searchParams.get("search") || "";
    const minFee = parseInt(searchParams.get("minFee") || "0");
    const maxFee = parseInt(searchParams.get("maxFee") || "5000000"); // 50L fallback
    const minRating = parseFloat(searchParams.get("minRating") || "0");
    const sortBy = (searchParams.get("sortBy") || "rating_desc") as SortOption;
    const cursor = searchParams.get("cursor") || null;
    const limit = parseInt(searchParams.get("limit") || "12");

    // Arrays
    const getArrayParam = (param: string) => {
      const vals1 = searchParams.getAll(param);
      const vals2 = searchParams.getAll(`${param}[]`);
      return [...vals1, ...vals2].filter(Boolean);
    };

    const states = getArrayParam("states");
    const cities = getArrayParam("cities");
    const streams = getArrayParam("streams");
    const ownership = getArrayParam("ownership");
    const accreditation = getArrayParam("accreditation");
    const exams = getArrayParam("exams");

    // Initialize WHERE clause filters
    const andFilters: any[] = [
      { feesMin: { gte: minFee } },
      { feesMax: { lte: maxFee } },
      { rating: { gte: minRating } },
    ];

    if (states.length > 0) andFilters.push({ state: { in: states } });
    if (cities.length > 0) andFilters.push({ city: { in: cities } });
    if (ownership.length > 0) andFilters.push({ ownership: { in: ownership } });
    if (accreditation.length > 0) andFilters.push({ accreditation: { in: accreditation } });
    if (streams.length > 0) andFilters.push({ courses: { some: { stream: { in: streams } } } });
    if (exams.length > 0) andFilters.push({ courses: { some: { eligibility: { in: exams } } } });

    // Handle Search Rank or Search matching IDs
    let searchMatchingIds: string[] | null = null;
    if (search) {
      // Create tsquery search term. Websearch is safer to prevent errors.
      const formattedSearch = search.trim().split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');
      
      let rawResults: { id: string }[] = [];
      try {
        if (formattedSearch) {
          rawResults = await prisma.$queryRawUnsafe(
            `SELECT id FROM "College" WHERE "searchVector" @@ to_tsquery('english', $1)`,
            formattedSearch
          );
        }
      } catch (err) {
        console.error("Full text search error, falling back to simple contains:", err);
        const fbResults = await prisma.college.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { state: { contains: search, mode: "insensitive" } }
            ]
          },
          select: { id: true }
        });
        rawResults = fbResults;
      }
      
      searchMatchingIds = rawResults.map(r => r.id);
      andFilters.push({ id: { in: searchMatchingIds } });
    }

    const whereClause = { AND: andFilters };

    // Count total count matching current filters (without pagination)
    const totalCount = await prisma.college.count({ where: whereClause });

    let colleges: any[] = [];
    let nextCursor: string | null = null;
    const take = limit;

    // Determine ordering and cursor keyset pagination
    if (search && sortBy === "relevance" && searchMatchingIds) {
      // For relevance, we slice the matching ID array based on cursor
      let startIndex = 0;
      if (cursor) {
        startIndex = searchMatchingIds.indexOf(cursor) + 1;
      }
      
      const pageIds = searchMatchingIds.slice(startIndex, startIndex + take + 1);
      const hasNextPage = pageIds.length > take;
      const pageIdsToQuery = hasNextPage ? pageIds.slice(0, take) : pageIds;

      colleges = await prisma.college.findMany({
        where: {
          id: { in: pageIdsToQuery },
          ...whereClause,
        },
        include: {
          courses: true,
          placements: true,
        },
      });

      // Sort in memory to preserve relevance rankings
      colleges.sort((a, b) => searchMatchingIds!.indexOf(a.id) - searchMatchingIds!.indexOf(b.id));

      if (hasNextPage && colleges.length > 0) {
        nextCursor = colleges[colleges.length - 1].id;
      }
    } else {
      // Keyset Pagination for standard sorts
      let cursorRecord: any = null;
      if (cursor) {
        cursorRecord = await prisma.college.findUnique({
          where: { id: cursor },
          include: { placements: true },
        });
      }

      if (cursorRecord) {
        if (sortBy === "rating_desc") {
          andFilters.push({
            OR: [
              { rating: { lt: cursorRecord.rating } },
              { rating: cursorRecord.rating, id: { gt: cursor } },
            ],
          });
        } else if (sortBy === "fees_asc") {
          andFilters.push({
            OR: [
              { feesMin: { gt: cursorRecord.feesMin } },
              { feesMin: cursorRecord.feesMin, id: { gt: cursor } },
            ],
          });
        } else if (sortBy === "fees_desc") {
          andFilters.push({
            OR: [
              { feesMax: { lt: cursorRecord.feesMax } },
              { feesMax: cursorRecord.feesMax, id: { gt: cursor } },
            ],
          });
        } else if (sortBy === "placement_desc") {
          const curAvg = cursorRecord.placements?.averagePackage ?? 0;
          andFilters.push({
            OR: [
              { placements: { averagePackage: { lt: curAvg } } },
              {
                placements: { averagePackage: curAvg },
                id: { gt: cursor },
              },
            ],
          });
        } else {
          andFilters.push({ id: { gt: cursor } });
        }
      }

      let orderByClause: any = [];
      if (sortBy === "rating_desc") {
        orderByClause = [{ rating: "desc" }, { id: "asc" }];
      } else if (sortBy === "fees_asc") {
        orderByClause = [{ feesMin: "asc" }, { id: "asc" }];
      } else if (sortBy === "fees_desc") {
        orderByClause = [{ feesMax: "desc" }, { id: "asc" }];
      } else if (sortBy === "placement_desc") {
        orderByClause = [{ placements: { averagePackage: "desc" } }, { id: "asc" }];
      } else {
        orderByClause = [{ rating: "desc" }, { id: "asc" }];
      }

      const rawColleges = await prisma.college.findMany({
        where: whereClause,
        take: take + 1,
        orderBy: orderByClause,
        include: {
          courses: true,
          placements: true,
        },
      });

      const hasNextPage = rawColleges.length > take;
      colleges = hasNextPage ? rawColleges.slice(0, take) : rawColleges;

      if (hasNextPage && colleges.length > 0) {
        nextCursor = colleges[colleges.length - 1].id;
      }
    }

    // Include isSaved status if authenticated
    const session = await auth();
    const userId = session?.user?.id;
    if (userId && colleges.length > 0) {
      const savedColleges = await prisma.savedCollege.findMany({
        where: {
          userId,
          collegeId: { in: colleges.map(c => c.id) },
        },
        select: { collegeId: true },
      });
      const savedIds = new Set(savedColleges.map(sc => sc.collegeId));
      colleges = colleges.map(c => ({
        ...c,
        isSaved: savedIds.has(c.id),
      }));
    } else {
      colleges = colleges.map(c => ({
        ...c,
        isSaved: false,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        colleges,
        nextCursor,
        totalCount,
      },
    });
  } catch (error) {
    console.error("Get colleges error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
