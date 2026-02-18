import { NextRequest, NextResponse } from "next/server";
import { generateAutoScenario } from "@/lib/gemini";
import { UserProfile, StoryScenario } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profile,
      previousScenarios,
      intervention,
    }: {
      profile: UserProfile;
      previousScenarios: StoryScenario[];
      intervention?: string;
    } = body;

    if (!profile) {
      return NextResponse.json(
        { error: "profile은 필수입니다." },
        { status: 400 }
      );
    }

    const result = await generateAutoScenario(
      profile,
      previousScenarios || [],
      intervention
    );

    return NextResponse.json({
      timeLabel: result.timeLabel,
      content: result.content,
      autoChoice: result.autoChoice,
      isBranch: result.isBranch,
      branchMessage: result.branchMessage,
    });
  } catch (error) {
    console.error("Scenario API error:", error);
    return NextResponse.json(
      { error: "시나리오 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
