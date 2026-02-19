import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/gemini";
import { UserProfile, ChatMessage } from "@/lib/types";
import { computeAllAstrology, formatAstrologyForPrompt } from "@/lib/astrology";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profile,
      messages,
      chosenLabel,
    }: {
      profile: UserProfile;
      messages: ChatMessage[];
      chosenLabel?: string;
    } = body;

    if (!profile || !messages) {
      return NextResponse.json(
        { error: "profile과 messages는 필수입니다." },
        { status: 400 }
      );
    }

    // Compute astrology data from profile
    const astrology = computeAllAstrology(profile.birthday, profile.birthTime);
    const astrologyText = formatAstrologyForPrompt(astrology);

    const result = await generateChatResponse(profile, messages, chosenLabel, astrologyText);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "응답 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
