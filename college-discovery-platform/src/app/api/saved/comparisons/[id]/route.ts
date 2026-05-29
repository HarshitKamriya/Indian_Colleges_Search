import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const comparison = await prisma.savedComparison.findUnique({
      where: { id },
    });

    if (!comparison) {
      return NextResponse.json(
        { success: false, error: "Comparison not found" },
        { status: 404 }
      );
    }

    if (comparison.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await prisma.savedComparison.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Comparison deleted successfully.",
    });
  } catch (error) {
    console.error("Delete saved comparison error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
