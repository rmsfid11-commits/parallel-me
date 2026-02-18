import { NextRequest, NextResponse } from "next/server";
import { generateOnboardingReaction } from "@/lib/gemini";
import { UserProfile } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { step, userInput, collectedProfile } = await request.json() as {
      step: number;
      userInput: string;
      collectedProfile: Partial<UserProfile>;
    };

    if (step === undefined || !userInput) {
      return NextResponse.json(
        { error: "step과 userInput은 필수입니다." },
        { status: 400 }
      );
    }

    const reaction = await generateOnboardingReaction(
      step,
      userInput,
      collectedProfile || {}
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
