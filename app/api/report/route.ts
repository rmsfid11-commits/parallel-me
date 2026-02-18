import { NextRequest, NextResponse } from "next/server";
import { generateUniverseReport } from "@/lib/gemini";
import { UserProfile } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profile,
      branchSummaries,
    }: {
      profile: UserProfile;
      branchSummaries: { timeLabel: string; summary: string; chosen: string; notChosen: string[] }[];
    } = body;

    if (!profile || !branchSummaries) {
      return NextResponse.json(
        { error: "profile과 branchSummaries는 필수입니다." },
        { status: 400 }
      );
    }

    const report = await generateUniverseReport(profile, branchSummaries);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report API error:", error);
    return NextResponse.json(
      { error: "리포트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
