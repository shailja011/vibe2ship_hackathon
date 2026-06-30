// lib/ai.ts — client-side calls to our server API routes (key never exposed to browser)

export async function aiCategorizeIssue(title:string, description:string) {
  const res = await fetch("/api/ai/categorize", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ title, description }),
  });
  return res.json();
}

export async function aiPrioritizeTasks(tasks:{title:string;priority:string;category:string}[]) {
  const res = await fetch("/api/ai/prioritize", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ tasks }),
  });
  return res.json();
}

export async function aiScheduleDay(tasks:{title:string}[]) {
  const res = await fetch("/api/ai/schedule", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ tasks }),
  });
  return res.json();
}

export async function aiInsights(payload:any) {
  const res = await fetch("/api/ai/insights", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload),
  });
  return res.json();
}
