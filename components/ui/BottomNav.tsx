"use client";
import { COLORS as C } from "@/lib/constants";

const TABS = [
  { id:"home",     icon:"⚡", label:"Home" },
  { id:"tasks",    icon:"✅", label:"Tasks" },
  { id:"habits",   icon:"🔥", label:"Habits" },
  { id:"civic",    icon:"🗺️", label:"Civic" },
  { id:"goals",    icon:"🎯", label:"Goals" },
  { id:"insights", icon:"🧠", label:"AI" },
];

export default function BottomNav({ tab, onChange }: { tab:string; onChange:(t:string)=>void }) {
  return (
    <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", position:"sticky", bottom:0, zIndex:100 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ flex:1, background:"none", border:"none", padding:"10px 0 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <span style={{ fontSize:18 }}>{t.icon}</span>
          <span style={{ fontSize:9, fontWeight:700, color: tab===t.id ? C.violet : C.grayDark }}>{t.label}</span>
          {tab===t.id && <div style={{ width:16, height:2, background:C.violet, borderRadius:1 }} />}
        </button>
      ))}
    </div>
  );
}
