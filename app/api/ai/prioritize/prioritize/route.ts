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

    const rawText = (msg.content[0] as any).text.trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/,"").replace(/```\s*$/,"").trim();
    try {
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      console.error("AI Prioritize JSON parse failed. Raw text was:", rawText);
      return NextResponse.json([]);
    }
  } catch (e:any) {
    console.error("AI Prioritize API error:", e?.message || e);
    return NextResponse.json([]);
  }
}
