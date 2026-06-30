"use client";
import { useState } from "react";
import type { Profile } from "@/types";
import { COLORS as C, getBadge } from "@/lib/constants";

export default function Navbar({ profile, onLogout, isListening, onVoice }: {
  profile: Profile|null; onLogout: () => void; isListening: boolean; onVoice: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const badge = getBadge(profile?.points ?? 0);

  return (
    <nav style={s.nav}>
      <div style={s.brand}>
        <div style={s.icon}>⚡</div>
        <div>
          <div style={s.title}>Hero App</div>
          <div style={s.sub}>Smart Life OS</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onVoice}
          style={{ background:isListening?`${C.red}33`:C.surfaceHi, border:`1px solid ${isListening?C.red:C.border}`, borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", animation:isListening?"pulse 1s infinite":"none" }}>
          🎤
        </button>
        <div style={{ textAlign:"right" }} onClick={() => setMenu(!menu)} className="fade-in">
          <div style={{ color:C.violetLt, fontSize:12, fontWeight:700, cursor:"pointer" }}>{badge.icon} {badge.name}</div>
          <div style={{ color:C.amber, fontSize:11, fontWeight:800 }}>{profile?.points ?? 0} pts</div>
        </div>
        <div style={{ position:"relative" }}>
          <div onClick={() => setMenu(!menu)} style={s.avatar}>
            {profile?.full_name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          {menu && (
            <div style={s.dropdown} className="fade-in">
              <div style={s.dropHead}>
                <div style={{ color:C.white, fontWeight:700 }}>{profile?.full_name}</div>
                <div style={{ color:C.gray, fontSize:12 }}>@{profile?.username}</div>
              </div>
              <div style={s.dropItem}>📋 {profile?.reports_count ?? 0} Reports</div>
              <div style={s.dropItem}>✅ {profile?.resolved_count ?? 0} Resolved</div>
              <div style={{ ...s.dropItem, color:C.red, borderTop:`1px solid ${C.border}`, marginTop:4, paddingTop:8 }}
                onClick={() => { setMenu(false); onLogout(); }}>
                🚪 Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const s: Record<string,React.CSSProperties> = {
  nav: { background:C.surface, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:100 },
  brand: { display:"flex", alignItems:"center", gap:10 },
  icon: { background:`linear-gradient(135deg,${C.violet},${C.blue})`, borderRadius:9, width:34, height:34, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" },
  title: { color:C.white, fontWeight:900, fontSize:15, letterSpacing:-0.3 },
  sub: { color:C.gray, fontSize:10 },
  avatar: { width:34, height:34, background:C.surfaceHi, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, cursor:"pointer", fontSize:14 },
  dropdown: { position:"absolute", right:0, top:42, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:12, minWidth:180, zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,.5)" },
  dropHead: { marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${C.border}` },
  dropItem: { color:C.gray, fontSize:13, padding:"6px 0", cursor:"pointer" },
};
