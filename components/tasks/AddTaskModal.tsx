"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { COLORS as C, PRIORITY_META } from "@/lib/constants";
import type { Task } from "@/types";

export default function AddTaskModal({ userId, onSuccess, onClose }: {
  userId: string; onSuccess: (t: Task) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("Work");
  const [reminder, setReminder] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const points = { high:30, medium:20, low:10 }[priority] ?? 20;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: userId, title, priority, category, reminder, points,
      due_date: new Date().toISOString().split("T")[0],
    }).select().single();
    setBusy(false);
    if (!error && data) onSuccess(data as Task);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.surface, borderRadius:16, width:"100%", maxWidth:400, padding:24, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ color:C.white, fontSize:18, fontWeight:800 }}>Add Task</div>
          <button onClick={onClose} style={{ background:C.surfaceHi, border:"none", color:C.gray, borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ color:C.gray, fontSize:11, fontWeight:700, display:"block", marginBottom:6 }}>TASK TITLE *</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What needs to be done?"
            onKeyDown={e=>e.key==="Enter"&&add()}
            style={{ width:"100%", background:C.surfaceHi, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.white, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ color:C.gray, fontSize:11, fontWeight:700, display:"block", marginBottom:8 }}>PRIORITY</label>
          <div style={{ display:"flex", gap:8 }}>
            {["high","medium","low"].map(p => {
              const pm = PRIORITY_META[p];
              return <button key={p} onClick={()=>setPriority(p)}
                style={{ flex:1, background:priority===p?pm.bg:C.surfaceHi, border:`1.5px solid ${priority===p?pm.color:"transparent"}`, borderRadius:8, padding:"8px 0", color:priority===p?pm.color:C.gray, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {pm.label}
              </button>;
            })}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ color:C.gray, fontSize:11, fontWeight:700, display:"block", marginBottom:8 }}>CATEGORY</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["Work","Health","Learning","Personal","Other"].map(c => (
              <button key={c} onClick={()=>setCategory(c)}
                style={{ background:category===c?`${C.violet}33`:C.surfaceHi, border:`1px solid ${category===c?C.violet:"transparent"}`, borderRadius:8, padding:"5px 10px", color:category===c?C.violetLt:C.gray, fontSize:12, cursor:"pointer" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div onClick={()=>setReminder(!reminder)} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, cursor:"pointer" }}>
          <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${reminder?C.violet:C.grayDark}`, background:reminder?C.violet:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>
            {reminder && "✓"}
          </div>
          <span style={{ color:C.gray, fontSize:13 }}>🔔 Set reminder</span>
        </div>
        <button onClick={add} disabled={!title.trim()||busy}
          style={{ width:"100%", background: !title.trim()||busy ? C.surfaceHi : `linear-gradient(135deg,${C.violet},${C.blue})`, border:"none", color:C.white, borderRadius:10, padding:"13px 0", fontWeight:800, fontSize:15, cursor: !title.trim()||busy ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {busy ? <span className="spinner" /> : "✅ Add Task"}
        </button>
      </div>
    </div>
  );
}
