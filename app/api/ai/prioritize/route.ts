import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json();
    if (!tasks?.length) return NextResponse.json([], { status:200 });

    const list = tasks.map((t:any) => `"${t.title}" (priority:${t.priority}, category:${t.category})`).join(", ");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a productivity AI. Given these tasks: ${list}
Return ONLY a JSON array of task titles in order of priority (most important/urgent first), with a one-line reason each.
Format: [{"title":"...","reason":"..."}]. No markdown, no explanation.`,
      }],
    });

    const text = (msg.content[0] as any).text.trim();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json([]);
  }
}
