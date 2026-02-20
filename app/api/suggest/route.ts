import { NextRequest, NextResponse } from "next/server";
import { generateSuggestions } from "@/lib/gemini";
import { ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: ChatMessage[] } = await request.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await generateSuggestions(messages);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggest API error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
