"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthCtx } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { aiPrioritizeTasks, aiScheduleDay, aiInsights } from "@/lib/ai";
import { COLORS as C, CAT_META, STATUS_META, PRIORITY_META, getBadge, timeAgo, getCat } from "@/lib/constants";
import type { Task, Habit, Goal, Issue, Profile } from "@/types";
import Navbar from "@/components/ui/Navbar";
import BottomNav from "@/components/ui/BottomNav";
import HeroRing from "@/components/ui/HeroRing";
import Toast from "@/components/ui/Toast";
import ReportModal from "@/components/civic/ReportModal";
import AddTaskModal from "@/components/tasks/AddTaskModal";

const MapView = dynamic(() => import("@/components/civic/MapView"), { ssr:false });

type Tab = "home"|"tasks"|"habits"|"civic"|"goals"|"insights";

export default function DashboardPage() {
  const router = useRouter();
  const { userId, profile, loading: authLoading, logout, refresh } = useAuthCtx();

  const [tab, setTab] = useState<Tab>("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;color:string}|null>(null);
  const [userLat, setUserLat] = useState<number|null>(null);
  const [userLng, setUserLng] = useState<number|null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue|null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  // Auth guard
  useEffect(() => { if (!authLoading && !userId) router.push("/auth/login"); }, [authLoading, userId, router]);

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setUserLat(p.coords.latitude); setUserLng(p.coords.longitude); },
      () => { setUserLat(28.986); setUserLng(77.708); }
    );
  }, []);

  // Load all data
  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [t, h, g, i] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending:false }),
      supabase.from("habits").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("goals").select("*").eq("user_id", userId).order("deadline"),
      supabase.from("issues").select("*, reporter:profiles!reported_by(username,full_name,avatar_url)").order("created_at",{ascending:false}).limit(50),
    ]);
    setTasks((t.data ?? []) as Task[]);
    setHabits((h.data ?? []) as Habit[]);
    setGoals((g.data ?? []) as Goal[]);
    setIssues((i.data ?? []) as Issue[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime issues
  useEffect(() => {
    const ch = supabase.channel("issues-rt").on("postgres_changes", { event:"*", schema:"public", table:"issues" }, async payload => {
      if (payload.eventType === "INSERT") {
        const { data } = await supabase.from("issues").select("*, reporter:profiles!reported_by(username,full_name,avatar_url)").eq("id",(payload.new as Issue).id).single();
        if (data) setIssues(prev => [data as Issue, ...prev]);
      } else if (payload.eventType === "UPDATE") {
        setIssues(prev => prev.map(i => i.id===(payload.new as Issue).id ? {...i,...payload.new} : i));
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function showToast(msg:string, color=C.green) { setToast({msg,color}); setTimeout(()=>setToast(null),3000); }

  // ── Task actions ─────────────────────────────────────────
  async function toggleTask(task: Task) {
    const { error } = await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id===task.id ? {...t, done:!t.done} : t));
      if (!task.done) showToast(`✅ +${task.points} pts!`, C.green);
      await refresh();
    }
  }

  function onTaskAdded(task: Task) { setTasks(prev => [task, ...prev]); setShowAddTask(false); showToast("✅ Task added!", C.green); }

  // ── Habit actions ────────────────────────────────────────
  async function toggleHabit(habit: Habit) {
    const completed = !habit.completed_today;
    const streak = completed ? habit.streak + 1 : Math.max(0, habit.streak - 1);
    const { error } = await supabase.from("habits").update({ completed_today: completed, streak }).eq("id", habit.id);
    if (!error) {
      setHabits(prev => prev.map(h => h.id===habit.id ? {...h, completed_today:completed, streak} : h));
      if (completed) showToast("🔥 Habit done! +20 pts", C.green);
      await refresh();
    }
  }

  // ── Goal actions ─────────────────────────────────────────
  async function toggleMilestone(goal: Goal, idx: number) {
    const newDone = [...goal.milestones_done];
    newDone[idx] = !newDone[idx];
    const progress = Math.round(newDone.filter(Boolean).length / newDone.length * 100);
    const { error } = await supabase.from("goals").update({ milestones_done: newDone, progress }).eq("id", goal.id);
    if (!error) {
      setGoals(prev => prev.map(g => g.id===goal.id ? {...g, milestones_done:newDone, progress} : g));
      if (newDone[idx]) showToast("🎯 Milestone done!", C.green);
    }
  }

  // ── Civic actions ────────────────────────────────────────
  async function upvoteIssue(issueId: string) {
    if (!userId) return;
    const { data } = await supabase.rpc("handle_upvote", { p_issue_id: issueId, p_user_id: userId });
    if (data?.action === "already_voted") showToast("Already upvoted!", C.amber);
    else { showToast("▲ Upvoted! +5 pts", C.amber); await refresh(); }
  }

  async function verifyIssue(issueId: string) {
    if (!userId) return;
    const { data } = await supabase.rpc("handle_verify", { p_issue_id: issueId, p_user_id: userId });
    if (data?.action === "already_verified") showToast("Already verified!", C.amber);
    else { showToast("✓ Verified! +8 pts", C.blue); await refresh(); }
  }

  function onIssueReported(issue: Issue) {
    setShowReport(false); setSelectedIssue(issue); setTab("civic");
    showToast("📍 Issue reported! +50 pts", C.green);
    refresh();
  }

  // ── Voice commands ───────────────────────────────────────
  function handleVoice() {
    const W = window as any;
    if (!('webkitSpeechRecognition' in W || 'SpeechRecognition' in W)) {
      showToast("Voice not supported in this browser", C.red); return;
    }
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
    setIsListening(true);
    rec.onresult = async (e:any) => {
      const text = e.results[0][0].transcript;
      setVoiceText(text); setIsListening(false);
      const lower = text.toLowerCase();
      if (lower.includes("add task")) {
        const title = text.replace(/add task/i,"").trim();
        if (title && userId) {
          const { data } = await supabase.from("tasks").insert({ user_id:userId, title, priority:"medium", category:"Work", points:20 }).select().single();
          if (data) { setTasks(prev=>[data as Task, ...prev]); showToast(`🎤 Task added: "${title}"`, C.green); }
        }
      } else if (lower.includes("report")) {
        setShowReport(true);
      } else {
        showToast(`🎤 Heard: "${text}"`, C.violet);
      }
    };
    rec.onerror = () => { setIsListening(false); showToast("Voice error", C.red); };
    rec.onend = () => setIsListening(false);
    rec.start();
  }

  // ── Hero Score ────────────────────────────────────────────
  const doneTasks = tasks.filter(t=>t.done).length;
  const totalTasks = tasks.length || 1;
  const doneHabits = habits.filter(h=>h.completed_today).length;
  const totalHabits = habits.length || 1;
  const myPts = profile?.points ?? 0;
  const taskScore = Math.round((doneTasks/totalTasks)*40);
  const habitScore = Math.round((doneHabits/totalHabits)*30);
  const civicScore = Math.round(Math.min(1, myPts/600)*30);
  const heroScore = Math.min(100, taskScore + habitScore + civicScore);

  if (authLoading || loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚡</div>
        <span className="spinner" />
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", fontFamily:"'Inter',system-ui,sans-serif", color:C.white, position:"relative" }}>
      {toast && <Toast msg={toast.msg} color={toast.color} />}
      {showReport && <ReportModal userId={userId!} userLat={userLat} userLng={userLng} onSuccess={onIssueReported} onClose={()=>setShowReport(false)} />}
      {showAddTask && <AddTaskModal userId={userId!} onSuccess={onTaskAdded} onClose={()=>setShowAddTask(false)} />}

      <Navbar profile={profile} onLogout={async()=>{await logout();router.push("/auth/login");}} isListening={isListening} onVoice={handleVoice} />

      <main style={{ flex:1, overflowY:"auto" }}>
        {tab==="home" && (
          <HomeTab heroScore={heroScore} tasks={tasks} habits={habits} issues={issues} doneTasks={doneTasks} totalTasks={tasks.length}
            doneHabits={doneHabits} totalHabits={habits.length} myPts={myPts} voiceText={voiceText} showToast={showToast} />
        )}
        {tab==="tasks" && (
          <TasksTab tasks={tasks} toggleTask={toggleTask} onAdd={()=>setShowAddTask(true)} showToast={showToast} />
        )}
        {tab==="habits" && <HabitsTab habits={habits} toggleHabit={toggleHabit} />}
        {tab==="civic" && (
          <CivicTab issues={issues} userLat={userLat} userLng={userLng} selected={selectedIssue} setSelected={setSelectedIssue}
            onReport={()=>setShowReport(true)} onUpvote={upvoteIssue} onVerify={verifyIssue} userId={userId} />
        )}
        {tab==="goals" && <GoalsTab goals={goals} toggleMilestone={toggleMilestone} />}
        {tab==="insights" && <InsightsTab tasks={tasks} habits={habits} issues={issues} goals={goals} myPts={myPts} heroScore={heroScore} />}
      </main>

      <BottomNav tab={tab} onChange={t=>setTab(t as Tab)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  HOME TAB
// ═══════════════════════════════════════════════════════
function HomeTab({ heroScore, tasks, habits, issues, doneTasks, totalTasks, doneHabits, totalHabits, myPts, voiceText, showToast }: any) {
  const [insights, setInsights] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const hour = now.getHours();
  const greet = hour<12 ? "Good morning" : hour<17 ? "Good afternoon" : "Good evening";
  const urgentIssues = issues.filter((i:Issue)=>i.severity==="high" && i.status!=="resolved").length;

  async function loadInsights() {
    setBusy(true);
    const issuesummary = issues.slice(0,10).map((i:Issue)=>`${i.category}[${i.status}]`).join(", ");
    const data = await aiInsights({ type:"daily", doneTasks, totalTasks, issuesummary });
    setInsights(data); setBusy(false);
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ color:C.gray, fontSize:13 }}>{hour<12?"☀️":hour<17?"🌤️":"🌙"} {greet}</div>
        <div style={{ color:C.white, fontSize:22, fontWeight:900, letterSpacing:-0.5 }}>Your Hero Dashboard</div>
        <div style={{ color:C.gray, fontSize:12, marginTop:2 }}>{now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      <div style={{ background:`linear-gradient(135deg,${C.violet}22,${C.blue}22)`, borderRadius:16, padding:20, marginBottom:16, border:`1px solid ${C.violet}33`, display:"flex", alignItems:"center", gap:20 }}>
        <HeroRing score={heroScore} size={110} />
        <div style={{ flex:1 }}>
          <div style={{ color:C.violetLt, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:6 }}>TODAY'S BREAKDOWN</div>
          {[
            { label:"Tasks", val:`${doneTasks}/${totalTasks}`, color:C.blue, pct: totalTasks?Math.round(doneTasks/totalTasks*100):0 },
            { label:"Habits", val:`${doneHabits}/${totalHabits}`, color:C.green, pct: totalHabits?Math.round(doneHabits/totalHabits*100):0 },
            { label:"Civic", val:`${myPts} pts`, color:C.violet, pct: Math.min(100, Math.round(myPts/600*100)) },
          ].map(s => (
            <div key={s.label} style={{ marginBottom:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ color:C.gray, fontSize:11 }}>{s.label}</span>
                <span style={{ color:s.color, fontSize:11, fontWeight:700 }}>{s.val}</span>
              </div>
              <div style={{ background:C.border, borderRadius:20, height:4 }}>
                <div style={{ background:s.color, width:`${s.pct}%`, height:"100%", borderRadius:20, transition:"width .5s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
        {[
          { icon:"🔥", label:"Streak", val:`${habits.length?Math.max(...habits.map((h:Habit)=>h.streak)):0}d`, color:C.amber },
          { icon:"🗺️", label:"Issues", val:issues.length, color:C.blue },
          { icon:"⚠️", label:"Urgent", val:urgentIssues, color:C.red },
        ].map(s => (
          <div key={s.label} style={{ background:C.surface, borderRadius:10, padding:12, border:`1px solid ${C.border}`, textAlign:"center" }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ color:s.color, fontSize:18, fontWeight:900 }}>{s.val}</div>
            <div style={{ color:C.gray, fontSize:10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {voiceText && (
        <div style={{ background:C.surfaceHi, borderRadius:10, padding:12, marginBottom:14, border:`1px solid ${C.violet}44`, display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:18 }}>🎤</span>
          <div>
            <div style={{ color:C.violetLt, fontSize:10, fontWeight:700 }}>LAST VOICE COMMAND</div>
            <div style={{ color:C.white, fontSize:13 }}>"{voiceText}"</div>
          </div>
        </div>
      )}

      <div style={{ background:C.surface, borderRadius:12, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ color:C.white, fontSize:14, fontWeight:700 }}>📋 Today's Tasks</div>
          <div style={{ color:C.gray, fontSize:12 }}>{doneTasks}/{totalTasks} done</div>
        </div>
        {tasks.slice(0,3).map((t: Task) => (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${t.done?C.green:PRIORITY_META[t.priority].color}`, background:t.done?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>{t.done?"✓":""}</div>
            <span style={{ color:t.done?C.grayDark:C.white, fontSize:13, textDecoration:t.done?"line-through":"none", flex:1 }}>{t.title}</span>
            <span style={{ background:PRIORITY_META[t.priority].bg, color:PRIORITY_META[t.priority].color, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20 }}>{t.priority}</span>
          </div>
        ))}
        {tasks.length===0 && <div style={{ color:C.grayDark, fontSize:12, textAlign:"center", padding:10 }}>No tasks yet — add one!</div>}
      </div>

      {!insights ? (
        <button onClick={loadInsights} disabled={busy}
          style={{ width:"100%", background: busy ? C.surfaceHi : `linear-gradient(135deg,${C.violet},${C.blue})`, border:"none", color:C.white, borderRadius:10, padding:"13px 0", fontWeight:800, cursor:busy?"not-allowed":"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {busy ? <><span className="spinner" />Analyzing...</> : "🧠 Get AI Daily Insights"}
        </button>
      ) : (
        <div style={{ background:`linear-gradient(135deg,${C.violet}22,${C.blue}22)`, borderRadius:12, padding:14, border:`1px solid ${C.violet}44` }}>
          <div style={{ color:C.violetLt, fontSize:11, fontWeight:700, marginBottom:10 }}>🧠 AI DAILY INSIGHTS</div>
          <div style={{ color:C.white, fontSize:12, marginBottom:8, lineHeight:1.5 }}>💼 {insights.personal}</div>
          <div style={{ color:C.gray, fontSize:12, marginBottom:8, lineHeight:1.5 }}>🏙️ {insights.civic}</div>
          <div style={{ background:`${C.amber}22`, borderRadius:8, padding:"8px 10px", borderLeft:`3px solid ${C.amber}` }}>
            <div style={{ color:C.amber, fontSize:11, fontWeight:700, marginBottom:2 }}>⚡ HERO TIP</div>
            <div style={{ color:C.white, fontSize:12 }}>{insights.hero_tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  TASKS TAB
// ═══════════════════════════════════════════════════════
function TasksTab({ tasks, toggleTask, onAdd, showToast }: any) {
  const [view, setView] = useState("list");
  const [prioritized, setPrioritized] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const byPriority = [...tasks].sort((a:Task,b:Task)=>({high:0,medium:1,low:2} as any)[a.priority]-({high:0,medium:1,low:2} as any)[b.priority]);

  async function handlePrioritize() {
    setBusy(true);
    const result = await aiPrioritizeTasks(tasks.filter((t:Task)=>!t.done).map((t:Task)=>({title:t.title,priority:t.priority,category:t.category})));
    setPrioritized(Array.isArray(result)?result:[]); setBusy(false);
    showToast("🤖 AI prioritized your tasks!", C.violet);
  }

  async function handleSchedule() {
    setBusy(true);
    const result = await aiScheduleDay(tasks.filter((t:Task)=>!t.done).map((t:Task)=>({title:t.title})));
    setSchedule(Array.isArray(result)?result:[]); setBusy(false);
    showToast("📅 Schedule generated!", C.violet);
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2 }}>TASK MANAGER</div>
          <div style={{ color:C.white, fontSize:18, fontWeight:800 }}>My Tasks</div>
        </div>
        <button onClick={onAdd} style={{ background:C.violet, color:C.white, border:"none", borderRadius:8, padding:"8px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>+ Add</button>
      </div>

      <div style={{ display:"flex", background:C.surface, borderRadius:8, padding:3, marginBottom:14, border:`1px solid ${C.border}` }}>
        {[["list","📋 List"],["schedule","📅 Schedule"],["priority","🤖 AI Priority"]].map(([v,l]) => (
          <button key={v} onClick={()=>setView(v)}
            style={{ flex:1, background:view===v?C.surfaceHi:"none", border:"none", color:view===v?C.white:C.gray, padding:"7px 0", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {view==="list" && (
        <div>
          {["high","medium","low"].map(pri => {
            const group = byPriority.filter((t:Task)=>t.priority===pri);
            if (!group.length) return null;
            const pm = PRIORITY_META[pri];
            return (
              <div key={pri} style={{ marginBottom:16 }}>
                <div style={{ color:pm.color, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8 }}>{pm.label.toUpperCase()} PRIORITY</div>
                {group.map((t:Task) => (
                  <div key={t.id} onClick={()=>toggleTask(t)}
                    style={{ background:C.surface, borderRadius:10, padding:12, marginBottom:6, border:`1px solid ${t.done?C.border:pm.color+"44"}`, cursor:"pointer", display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${t.done?C.green:pm.color}`, background:t.done?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{t.done&&<span style={{color:"#000"}}>✓</span>}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ color:t.done?C.grayDark:C.white, fontSize:13, fontWeight:600, textDecoration:t.done?"line-through":"none" }}>{t.title}</div>
                      <div style={{ color:C.grayDark, fontSize:11, marginTop:2 }}>{t.category} · {t.reminder?"🔔 ":""}+{t.points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {tasks.length===0 && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}><div style={{fontSize:32,marginBottom:8}}>📋</div>No tasks yet. Tap + Add to get started!</div>}
        </div>
      )}

      {view==="priority" && (
        <div>
          <button onClick={handlePrioritize} disabled={busy}
            style={{ width:"100%", background:`linear-gradient(135deg,${C.violet},${C.blue})`, border:"none", color:C.white, borderRadius:10, padding:"12px 0", fontWeight:800, cursor:"pointer", fontSize:14, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {busy ? <><span className="spinner" />Prioritizing...</> : "🤖 AI Prioritize My Tasks"}
          </button>
          {prioritized.length>0 && (
            <div>
              <div style={{ color:C.violetLt, fontSize:11, fontWeight:700, marginBottom:10 }}>AI RECOMMENDED ORDER</div>
              {prioritized.map((p,i) => (
                <div key={i} style={{ background:C.surface, borderRadius:10, padding:12, marginBottom:8, border:`1px solid ${C.border}`, display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ background:`linear-gradient(135deg,${C.violet},${C.blue})`, color:C.white, width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0 }}>{i+1}</div>
                  <div>
                    <div style={{ color:C.white, fontSize:13, fontWeight:700 }}>{p.title}</div>
                    <div style={{ color:C.violet, fontSize:11, marginTop:3 }}>💡 {p.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!prioritized.length && !busy && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}><div style={{fontSize:32,marginBottom:8}}>🤖</div>Click the button to let AI prioritize your tasks</div>}
        </div>
      )}

      {view==="schedule" && (
        <div>
          <button onClick={handleSchedule} disabled={busy}
            style={{ width:"100%", background:`linear-gradient(135deg,${C.violet},${C.blue})`, border:"none", color:C.white, borderRadius:10, padding:"12px 0", fontWeight:800, cursor:"pointer", fontSize:14, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {busy ? <><span className="spinner" />Scheduling...</> : "📅 Generate AI Schedule"}
          </button>
          {schedule.length>0 && (
            <div style={{ position:"relative", paddingLeft:20 }}>
              <div style={{ position:"absolute", left:8, top:0, bottom:0, width:2, background:C.border, borderRadius:1 }} />
              {schedule.map((s,i) => (
                <div key={i} style={{ position:"relative", marginBottom:14 }}>
                  <div style={{ position:"absolute", left:-16, top:4, width:10, height:10, borderRadius:"50%", background:C.violet, border:`2px solid ${C.bg}` }} />
                  <div style={{ background:C.surface, borderRadius:10, padding:12, border:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ color:C.violet, fontSize:12, fontWeight:700 }}>{s.time}</span>
                      <span style={{ color:C.grayDark, fontSize:11 }}>{s.duration}</span>
                    </div>
                    <div style={{ color:C.white, fontSize:13, fontWeight:600, marginBottom:4 }}>{s.task}</div>
                    <div style={{ color:C.gray, fontSize:11 }}>💡 {s.tip}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!schedule.length && !busy && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}><div style={{fontSize:32,marginBottom:8}}>📅</div>Generate a smart daily schedule</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  HABITS TAB
// ═══════════════════════════════════════════════════════
function HabitsTab({ habits, toggleHabit }: any) {
  const days = ["M","T","W","T","F","S","S"];
  return (
    <div style={{ padding:16 }}>
      <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:4 }}>HABIT TRACKER</div>
      <div style={{ color:C.white, fontSize:18, fontWeight:800, marginBottom:16 }}>Daily Habits</div>

      {habits.map((h: Habit) => (
        <div key={h.id} style={{ background:C.surface, borderRadius:12, padding:14, marginBottom:10, border:`1px solid ${h.completed_today?C.green+"44":C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:24 }}>{h.icon}</span>
              <div>
                <div style={{ color:C.white, fontWeight:700, fontSize:14 }}>{h.name}</div>
                <div style={{ color:C.grayDark, fontSize:11 }}>Target: {h.target} {h.unit}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:C.amber, fontSize:16, fontWeight:900 }}>{h.streak}</div>
                <div style={{ color:C.grayDark, fontSize:10 }}>day streak</div>
              </div>
              <button onClick={()=>toggleHabit(h)} style={{ width:36, height:36, borderRadius:"50%", border:`2px solid ${h.completed_today?C.green:C.border}`, background:h.completed_today?C.green:C.surfaceHi, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {h.completed_today?"✓":"○"}
              </button>
            </div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {(h.history?.length?h.history:[0,0,0,0,0,0,0]).slice(-7).map((done:number,i:number) => (
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                <div style={{ background:done?C.green:C.surfaceHi, borderRadius:4, height:24, marginBottom:3, border:`1px solid ${done?C.green:C.border}` }} />
                <div style={{ color:C.grayDark, fontSize:9 }}>{days[i]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {habits.length===0 && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}><div style={{fontSize:32,marginBottom:8}}>🔥</div>No habits tracked yet</div>}

      {habits.length>0 && (
        <div style={{ background:`linear-gradient(135deg,${C.green}22,${C.blue}22)`, borderRadius:12, padding:14, border:`1px solid ${C.green}33`, marginTop:4 }}>
          <div style={{ color:C.green, fontSize:11, fontWeight:700, marginBottom:8 }}>📊 HABIT SUMMARY</div>
          <div style={{ display:"flex", gap:16 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:C.green, fontSize:22, fontWeight:900 }}>{habits.filter((h:Habit)=>h.completed_today).length}</div>
              <div style={{ color:C.gray, fontSize:11 }}>Done Today</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:C.amber, fontSize:22, fontWeight:900 }}>{Math.max(...habits.map((h:Habit)=>h.streak))}</div>
              <div style={{ color:C.gray, fontSize:11 }}>Best Streak</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  CIVIC TAB
// ═══════════════════════════════════════════════════════
function CivicTab({ issues, userLat, userLng, selected, setSelected, onReport, onUpvote, onVerify, userId }: any) {
  const [civicView, setCivicView] = useState("map");
  const [filterStatus, setFilterStatus] = useState("all");
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const filtered = filterStatus==="all" ? issues : issues.filter((i:Issue)=>i.status===filterStatus);

  useEffect(() => {
    if (civicView==="board") {
      supabase.from("profiles").select("*").order("points",{ascending:false}).limit(15).then(({data})=>setLeaderboard((data??[]) as Profile[]));
    }
  }, [civicView]);

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2 }}>CIVIC GUARDIAN</div>
          <div style={{ color:C.white, fontSize:18, fontWeight:800 }}>Community Issues</div>
        </div>
        <button onClick={onReport} style={{ background:C.amber, color:"#000", border:"none", borderRadius:8, padding:"8px 14px", fontWeight:800, fontSize:13, cursor:"pointer" }}>+ Report</button>
      </div>

      <div style={{ display:"flex", background:C.surface, borderRadius:8, padding:3, marginBottom:14, border:`1px solid ${C.border}` }}>
        {[["map","🗺️ Map"],["feed","📋 Feed"],["board","🏆 Board"]].map(([v,l]) => (
          <button key={v} onClick={()=>setCivicView(v)} style={{ flex:1, background:civicView===v?C.surfaceHi:"none", border:"none", color:civicView===v?C.white:C.gray, padding:"7px 0", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {civicView==="map" && (
        <>
          <div style={{ borderRadius:12, overflow:"hidden", marginBottom:12, border:`1px solid ${C.border}`, height:300 }}>
            <MapView issues={issues} userLat={userLat} userLng={userLng} selectedIssue={selected} onPinClick={setSelected} />
          </div>
          {selected ? (
            <IssueCard issue={selected} onClose={()=>setSelected(null)} onUpvote={onUpvote} onVerify={onVerify} />
          ) : (
            <div style={{ background:C.surface, borderRadius:10, padding:14, border:`1px solid ${C.border}`, textAlign:"center" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>👆</div>
              <div style={{ color:C.gray, fontSize:13 }}>Tap a pin to see details</div>
              <div style={{ color:C.grayDark, fontSize:11, marginTop:2 }}>{issues.filter((i:Issue)=>i.status!=="resolved").length} active issues near you</div>
            </div>
          )}
        </>
      )}

      {civicView==="feed" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {["all","reported","verified","in-progress","resolved"].map(f => (
              <button key={f} onClick={()=>setFilterStatus(f)} style={{ background:filterStatus===f?C.violet:C.surface, color:filterStatus===f?C.white:C.gray, border:`1px solid ${filterStatus===f?C.violet:C.border}`, borderRadius:20, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                {f==="all"?"All":STATUS_META[f]?.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map((issue: Issue) => {
              const cat = getCat(issue.category); const sm = STATUS_META[issue.status];
              return (
                <div key={issue.id} onClick={()=>{setSelected(issue);setCivicView("map");}}
                  style={{ background:C.surface, borderRadius:10, padding:12, border:`1px solid ${C.border}`, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:18 }}>{cat.icon}</span>
                      <span style={{ color:C.white, fontWeight:700, fontSize:13 }}>{issue.title}</span>
                    </div>
                    <span style={{ background:sm.bg, color:sm.color, padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:700, whiteSpace:"nowrap", marginLeft:8 }}>{sm.label}</span>
                  </div>
                  <div style={{ color:C.gray, fontSize:12, lineHeight:1.4, marginBottom:8 }}>{(issue.description||"").slice(0,80)}...</div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:C.grayDark, fontSize:11 }}>{issue.reporter?.username??"Unknown"} · {timeAgo(issue.created_at)}</span>
                    <span style={{ color:C.amber, fontSize:11, fontWeight:700 }}>▲ {issue.upvotes}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {civicView==="board" && (
        <div>
          {leaderboard.map((u,i) => {
            const badge = getBadge(u.points); const isYou = u.id===userId;
            const medals = ["🥇","🥈","🥉"];
            return (
              <div key={u.id} style={{ background:isYou?`${C.violet}11`:C.surface, borderRadius:10, padding:12, marginBottom:8, border:`1px solid ${isYou?C.violet+"44":C.border}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ color:i<3?["#FFD700","#C0C0C0","#CD7F32"][i]:C.grayDark, fontSize:i<3?20:13, fontWeight:900, width:28, textAlign:"center" }}>{i<3?medals[i]:`#${i+1}`}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.white, fontWeight:700, fontSize:13 }}>{u.full_name||u.username} {isYou&&<span style={{color:C.violet,fontSize:10}}>(you)</span>}</div>
                  <div style={{ color:C.grayDark, fontSize:10, marginTop:2 }}><span style={{color:C.violetLt}}>{badge.icon} {badge.name}</span> · {u.reports_count} reports · {u.resolved_count} resolved</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:C.amber, fontWeight:900, fontSize:18 }}>{u.points}</div>
                  <div style={{ color:C.grayDark, fontSize:10 }}>pts</div>
                </div>
              </div>
            );
          })}
          {leaderboard.length===0 && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}>Loading leaderboard...</div>}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, onClose, onUpvote, onVerify }: any) {
  const cat = getCat(issue.category); const sm = STATUS_META[issue.status];
  const statuses = ["reported","verified","in-progress","resolved"];
  return (
    <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <div style={{ background:`linear-gradient(135deg,${cat.color}22,${C.surfaceHi})`, padding:"12px 14px 10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:26 }}>{cat.icon}</span>
            <div>
              <div style={{ color:C.white, fontWeight:800, fontSize:14 }}>{issue.title}</div>
              <div style={{ color:C.gray, fontSize:11, marginTop:2 }}>by {issue.reporter?.username??"Unknown"} · {timeAgo(issue.created_at)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.gray, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
      </div>
      <div style={{ padding:12 }}>
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          <span style={{ background:sm.bg, color:sm.color, padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>{sm.label}</span>
          <span style={{ background:`${cat.color}22`, color:cat.color, padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>{issue.category}</span>
          <span style={{ background:issue.severity==="high"?`${C.red}22`:`${C.amber}22`, color:issue.severity==="high"?C.red:C.amber, padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>{issue.severity?.toUpperCase()}</span>
        </div>
        {issue.description && <p style={{ color:C.gray, fontSize:12, lineHeight:1.5, marginBottom:12 }}>{issue.description}</p>}
        {issue.image_url && <img src={issue.image_url} alt="" style={{ width:"100%", borderRadius:8, marginBottom:12, maxHeight:160, objectFit:"cover" }} />}
        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {statuses.map((s,i) => { const idx=statuses.indexOf(issue.status); return <div key={s} style={{ flex:1, height:4, background:i<=idx?STATUS_META[s].color:C.border, borderRadius:2 }} />; })}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>onUpvote(issue.id)} style={{ flex:1, background:`${C.amber}22`, border:`1px solid ${C.amber}44`, color:C.amber, borderRadius:8, padding:"9px 0", fontWeight:700, fontSize:13, cursor:"pointer" }}>▲ Upvote ({issue.upvotes})</button>
          <button onClick={()=>onVerify(issue.id)} style={{ flex:1, background:`${C.blue}22`, border:`1px solid ${C.blue}44`, color:C.blue, borderRadius:8, padding:"9px 0", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓ Verify ({issue.verified_count??0})</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  GOALS TAB
// ═══════════════════════════════════════════════════════
function GoalsTab({ goals, toggleMilestone }: any) {
  const catColors: Record<string,string> = { Work:C.blue, Health:C.green, Learning:C.amber };
  return (
    <div style={{ padding:16 }}>
      <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:4 }}>GOAL TRACKING</div>
      <div style={{ color:C.white, fontSize:18, fontWeight:800, marginBottom:16 }}>My Goals</div>
      {goals.map((g: Goal) => {
        const daysLeft = Math.ceil((new Date(g.deadline).getTime()-Date.now())/86400000);
        const col = catColors[g.category] ?? C.violet;
        return (
          <div key={g.id} style={{ background:C.surface, borderRadius:12, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:C.white, fontWeight:800, fontSize:15 }}>{g.title}</div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <span style={{ background:`${col}22`, color:col, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>{g.category}</span>
                  <span style={{ color:daysLeft<7?C.red:C.gray, fontSize:11 }}>{daysLeft>0?`${daysLeft}d left`:"Overdue!"}</span>
                </div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:col, fontSize:22, fontWeight:900 }}>{g.progress}%</div>
                <div style={{ color:C.grayDark, fontSize:10 }}>complete</div>
              </div>
            </div>
            <div style={{ background:C.border, borderRadius:20, height:8, marginBottom:12 }}>
              <div style={{ background:`linear-gradient(90deg,${col},${col}99)`, width:`${g.progress}%`, height:"100%", borderRadius:20, transition:"width .5s" }} />
            </div>
            <div style={{ color:C.gray, fontSize:11, fontWeight:700, marginBottom:8 }}>MILESTONES</div>
            {g.milestones.map((m: string, i: number) => (
              <div key={i} onClick={()=>toggleMilestone(g,i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${g.milestones_done[i]?col:C.grayDark}`, background:g.milestones_done[i]?col:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>{g.milestones_done[i]&&<span style={{color:"#000"}}>✓</span>}</div>
                <span style={{ color:g.milestones_done[i]?C.grayDark:C.white, fontSize:13, textDecoration:g.milestones_done[i]?"line-through":"none" }}>{m}</span>
              </div>
            ))}
          </div>
        );
      })}
      {goals.length===0 && <div style={{ textAlign:"center", padding:30, color:C.grayDark }}><div style={{fontSize:32,marginBottom:8}}>🎯</div>No goals set yet</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  AI INSIGHTS TAB
// ═══════════════════════════════════════════════════════
function InsightsTab({ tasks, habits, issues, goals, myPts, heroScore }: any) {
  const [result, setResult] = useState<any>(null);
  const [type, setType] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function run(t: string) {
    setLoading(true); setType(t); setResult(null);
    let data;
    if (t==="productivity") {
      data = await aiInsights({ type:"productivity", doneTasks:tasks.filter((x:Task)=>x.done).length, totalTasks:tasks.length, doneHabits:habits.filter((h:Habit)=>h.completed_today).length, totalHabits:habits.length, heroScore });
    } else if (t==="civic") {
      const issuesSummary = issues.map((i:Issue)=>`${i.category}[${i.status}] upvotes:${i.upvotes}`).join(";");
      data = await aiInsights({ type:"civic", issuesSummary, myPoints:myPts });
    } else if (t==="goals") {
      const goalsSummary = goals.map((g:Goal)=>`"${g.title}" ${g.progress}% done, due ${g.deadline}`).join("; ");
      data = await aiInsights({ type:"goals", goalsSummary });
    }
    setResult(data); setLoading(false);
  }

  const TYPES = [
    { id:"productivity", icon:"💼", label:"Productivity Analysis", color:C.blue },
    { id:"civic",        icon:"🏙️", label:"Civic Impact Report",  color:C.violet },
    { id:"goals",        icon:"🎯", label:"Goal Health Check",     color:C.green },
  ];

  return (
    <div style={{ padding:16 }}>
      <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:4 }}>AI BRAIN</div>
      <div style={{ color:C.white, fontSize:18, fontWeight:800, marginBottom:16 }}>Personalized Insights</div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {TYPES.map(it => (
          <button key={it.id} onClick={()=>run(it.id)} disabled={loading}
            style={{ background:`linear-gradient(135deg,${it.color}22,${C.surface})`, border:`1px solid ${it.color}44`, borderRadius:12, padding:14, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:12, textAlign:"left" }}>
            <span style={{ fontSize:28 }}>{it.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ color:C.white, fontWeight:700, fontSize:14 }}>{it.label}</div>
              <div style={{ color:it.color, fontSize:11, marginTop:2 }}>Tap to generate with Claude AI</div>
            </div>
            {loading && type===it.id ? <span className="spinner" /> : <span style={{ color:it.color, fontSize:18 }}>→</span>}
          </button>
        ))}
      </div>

      {result && type==="productivity" && (
        <div style={{ background:`linear-gradient(135deg,${C.blue}22,${C.surface})`, borderRadius:12, padding:16, border:`1px solid ${C.blue}44` }}>
          <div style={{ color:C.blue, fontSize:11, fontWeight:700, marginBottom:10 }}>💼 PRODUCTIVITY ANALYSIS</div>
          <div style={{ color:C.gray, fontSize:12, marginBottom:10, fontStyle:"italic" }}>{result.summary}</div>
          <div style={{ color:C.white, fontSize:12, fontWeight:700, marginBottom:8 }}>Your tips for tomorrow:</div>
          {result.tips?.map((tip:string,i:number) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
              <div style={{ background:C.blue, color:"#000", width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, flexShrink:0 }}>{i+1}</div>
              <div style={{ color:C.white, fontSize:13, lineHeight:1.4 }}>{tip}</div>
            </div>
          ))}
          <div style={{ background:`${C.green}22`, borderRadius:8, padding:"10px 12px", marginTop:10, border:`1px solid ${C.green}33` }}>
            <div style={{ color:C.green, fontSize:11, fontWeight:700 }}>🔮 PREDICTED SCORE TOMORROW</div>
            <div style={{ color:C.white, fontSize:20, fontWeight:900, marginTop:4 }}>{result.score_prediction} / 100</div>
          </div>
        </div>
      )}

      {result && type==="civic" && (
        <div style={{ background:`linear-gradient(135deg,${C.violet}22,${C.surface})`, borderRadius:12, padding:16, border:`1px solid ${C.violet}44` }}>
          <div style={{ color:C.violetLt, fontSize:11, fontWeight:700, marginBottom:10 }}>🏙️ CIVIC IMPACT REPORT</div>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ background:`${C.red}22`, borderRadius:8, padding:10, flex:1, textAlign:"center" }}>
              <div style={{ color:C.red, fontSize:20, fontWeight:900 }}>{result.urgentCount}</div>
              <div style={{ color:C.gray, fontSize:10 }}>Urgent Issues</div>
            </div>
            <div style={{ background:`${C.violet}22`, borderRadius:8, padding:10, flex:2, textAlign:"center" }}>
              <div style={{ color:C.violetLt, fontSize:13, fontWeight:700 }}>{result.topProblem}</div>
              <div style={{ color:C.gray, fontSize:10 }}>Top Problem</div>
            </div>
          </div>
          <div style={{ color:C.gray, fontSize:12, lineHeight:1.5, marginBottom:8 }}>📈 {result.prediction}</div>
          <div style={{ color:C.amber, fontSize:12, lineHeight:1.5, marginBottom:8 }}>💡 {result.recommendation}</div>
          <div style={{ background:`${C.green}22`, borderRadius:8, padding:10, border:`1px solid ${C.green}33` }}>
            <div style={{ color:C.green, fontSize:12 }}>⚡ {result.impact}</div>
          </div>
        </div>
      )}

      {result && type==="goals" && (
        <div style={{ background:`linear-gradient(135deg,${C.green}22,${C.surface})`, borderRadius:12, padding:16, border:`1px solid ${C.green}44` }}>
          <div style={{ color:C.green, fontSize:11, fontWeight:700, marginBottom:10 }}>🎯 GOAL HEALTH CHECK</div>
          {result.onTrack?.length>0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ color:C.green, fontSize:11, fontWeight:700, marginBottom:6 }}>✅ ON TRACK</div>
              {result.onTrack.map((g:string,i:number) => <div key={i} style={{ color:C.white, fontSize:13, marginBottom:4 }}>• {g}</div>)}
            </div>
          )}
          {result.atRisk?.length>0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ color:C.red, fontSize:11, fontWeight:700, marginBottom:6 }}>⚠️ AT RISK</div>
              {result.atRisk.map((g:string,i:number) => <div key={i} style={{ color:C.white, fontSize:13, marginBottom:4 }}>• {g}</div>)}
            </div>
          )}
          <div style={{ background:`${C.amber}22`, borderRadius:8, padding:10, marginBottom:10, border:`1px solid ${C.amber}33` }}>
            <div style={{ color:C.amber, fontSize:11, fontWeight:700, marginBottom:4 }}>⚡ NEXT STEP</div>
            <div style={{ color:C.white, fontSize:13 }}>{result.nextStep}</div>
          </div>
          <div style={{ color:C.gray, fontSize:12, fontStyle:"italic" }}>{result.motivation}</div>
        </div>
      )}

      <div style={{ background:C.surface, borderRadius:12, padding:14, marginTop:14, border:`1px solid ${C.border}` }}>
        <div style={{ color:C.white, fontSize:13, fontWeight:700, marginBottom:12 }}>📊 Your Stats Overview</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { label:"Tasks Done",   val:`${tasks.filter((t:Task)=>t.done).length}/${tasks.length}`, color:C.blue },
            { label:"Habits Today", val:`${habits.filter((h:Habit)=>h.completed_today).length}/${habits.length}`, color:C.green },
            { label:"Civic Points", val:myPts, color:C.violet },
            { label:"Hero Score",   val:`${heroScore}/100`, color:C.amber },
          ].map(s => (
            <div key={s.label} style={{ background:C.surfaceHi, borderRadius:8, padding:10, border:`1px solid ${s.color}22` }}>
              <div style={{ color:s.color, fontSize:18, fontWeight:900 }}>{s.val}</div>
              <div style={{ color:C.gray, fontSize:11 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
