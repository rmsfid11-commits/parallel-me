import { NextRequest, NextResponse } from "next/server";
import { generateScenario } from "@/lib/gemini";
import { UserProfile, Scenario } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profile,
      stepNumber,
      previousScenarios,
      chosenLabel,
      intervention,
    }: {
      profile: UserProfile;
      stepNumber: number;
      previousScenarios: Scenario[];
      chosenLabel?: string;
      intervention?: string;
    } = body;

    if (!profile || !stepNumber) {
      return NextResponse.json(
        { error: "profile과 stepNumber는 필수입니다." },
        { status: 400 }
      );
    }

    const result = await generateScenario(
      profile,
      stepNumber,
      previousScenarios || [],
      chosenLabel,
      intervention
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "시나리오 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
