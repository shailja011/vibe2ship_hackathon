import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    if (!title) return NextResponse.json({ error:"Title required" }, { status:400 });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are a civic issue categorizer. Respond ONLY with JSON, no markdown:
{"category":"<Pothole|Street Light|Garbage|Water Leak|Broken Road|Encroachment|Other>","severity":"<low|medium|high>","suggestion":"<one action for municipality>"}

Title: "${title}"
${description ? `Description: "${description}"` : ""}`,
      }],
    });

    const text = (msg.content[0] as any).text.trim();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ category:"Other", severity:"medium", suggestion:"Report to local municipal authority." });
  }
}
