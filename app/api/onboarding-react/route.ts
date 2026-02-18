import { NextRequest, NextResponse } from "next/server";
import { generateOnboardingReaction } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { questionContext, userInput, previousInputs } = await request.json();

    if (!questionContext || !userInput) {
      return NextResponse.json(
        { error: "questionContext와 userInput은 필수입니다." },
        { status: 400 }
      );
    }

    const reaction = await generateOnboardingReaction(
      questionContext,
      userInput,
      previousInputs || {}
    );

    return NextResponse.json({ reaction });
  } catch (error) {
    console.error("Onboarding reaction error:", error);
    return NextResponse.json(
      { reaction: "..." },
      { status: 200 }
    );
  }
}
