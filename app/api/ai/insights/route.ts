import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function ask(prompt:string, maxTokens=400) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role:"user", content: prompt }],
  });
  const raw = (msg.content[0] as any).text.trim();
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/,"").replace(/```\s*$/,"").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI Insights JSON parse failed. Raw text was:", raw);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "daily") {
      const { doneTasks, totalTasks, issuesummary } = body;
      const data = await ask(`You are a personal + civic AI assistant. Give a short motivating daily insight.
Personal: ${doneTasks}/${totalTasks} tasks done today. Community issues: ${issuesummary}.
Return ONLY JSON: {"personal":"one sentence productivity insight","civic":"one sentence civic trend","hero_tip":"one actionable tip for today"}. No markdown.`, 300);
      return NextResponse.json(data);
    }

    if (type === "productivity") {
      const { doneTasks, totalTasks, doneHabits, totalHabits, heroScore } = body;
      const data = await ask(`Productivity coach AI. My stats: ${doneTasks}/${totalTasks} tasks done, ${doneHabits}/${totalHabits} habits done, Hero Score: ${heroScore}.
Give me 3 specific productivity tips for tomorrow. Return ONLY JSON: {"tips":["...","...","..."],"summary":"one sentence assessment","score_prediction":"predicted score tomorrow if I follow tips"}. No markdown.`, 400);
      return NextResponse.json(data);
    }

    if (type === "civic") {
      const { issuesSummary, myPoints } = body;
      const data = await ask(`Civic analytics AI. Issues in my area: ${issuesSummary}. My civic points: ${myPoints}.
Return ONLY JSON: {"topProblem":"...","urgentCount":N,"prediction":"30-day trend","recommendation":"...","impact":"your personal impact statement"}. No markdown.`, 400);
      return NextResponse.json(data);
    }

    if (type === "goals") {
      const { goalsSummary } = body;
      const data = await ask(`Goal coach AI. My goals: ${goalsSummary}.
Return ONLY JSON: {"atRisk":["goal title if behind"],"onTrack":["goal title if good"],"nextStep":"most important action today","motivation":"one motivating sentence"}. No markdown.`, 400);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error:"Unknown insight type" }, { status:400 });
  } catch (e) {
    return NextResponse.json({
      personal: "Keep pushing — every task done builds momentum.",
      civic: "Your community needs active reporters like you.",
      hero_tip: "Complete 3 tasks and report 1 issue to maximize your Hero Score today!",
      tips: ["Focus on high-priority tasks first","Block 90-minute deep work sessions","Review goals every morning"],
      summary: "You're making good progress, keep the momentum!",
      score_prediction: "85",
      topProblem: "Road Infrastructure",
      urgentCount: 3,
      prediction: "Issue rate may rise during monsoon season.",
      recommendation: "Prioritize road and drainage repairs before monsoon.",
      impact: "Your reports have helped your community.",
      atRisk: [],
      onTrack: [],
      nextStep: "Keep working on your top goal today.",
      motivation: "You're capable of more than you think.",
    });
  }
}
