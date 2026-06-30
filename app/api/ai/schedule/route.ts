import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json();
    if (!tasks?.length) return NextResponse.json([], { status:200 });

    const list = tasks.map((t:any) => t.title).join(", ");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `You are a scheduling assistant AI. Schedule these tasks for today starting from 9 AM, with realistic time blocks and short breaks: ${list}
Return ONLY a JSON array: [{"time":"9:00 AM","task":"...","duration":"30 min","tip":"one short productivity tip"}]. No markdown.`,
      }],
    });

    const text = (msg.content[0] as any).text.trim();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json([]);
  }
}
