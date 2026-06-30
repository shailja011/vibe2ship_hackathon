"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthCtx } from "@/components/auth/AuthProvider";
import { COLORS as C } from "@/lib/constants";

type Mode = "login"|"register";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuthCtx();
  const [mode, setMode]   = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [name, setName]   = useState("");
  const [user, setUser]   = useState("");
  const [error, setError] = useState("");
  const [info, setInfo]   = useState("");
  const [busy, setBusy]   = useState(false);

  async function submit() {
    setError(""); setInfo(""); setBusy(true);

    if(!email.trim())     { setError("Email is required."); setBusy(false); return; }
    if(pass.length < 6)   { setError("Password must be at least 6 characters."); setBusy(false); return; }
    if(mode==="register") {
      if(!name.trim())    { setError("Full name is required."); setBusy(false); return; }
      if(user.length < 3) { setError("Username must be at least 3 characters."); setBusy(false); return; }
    }

    try {
      if(mode==="login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password: pass,
        });
        if(error) { setError(extractError(error)); setBusy(false); return; }
        if(data.session) { await refresh(); window.location.href = "/dashboard"; }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password: pass,
          options: { data: { username: user.trim().toLowerCase(), full_name: name.trim() } },
        });
        console.log("Supabase signUp response:", { data, error });
        if(error) { setError(extractError(error)); setBusy(false); return; }
        if(!data.user) { setError("Registration failed — no user returned. Try a different email."); setBusy(false); return; }
        if(data.user && data.user.identities && data.user.identities.length === 0) {
          setError("This email is already registered. Please sign in instead."); setBusy(false); return;
        }
        if(data.session) {
          await refresh(); window.location.href = "/dashboard";
        } else {
          setInfo("Account created! Please check your email to confirm, then sign in.");
          setMode("login");
        }
      }
    } catch(e:any) {
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  }

  function extractError(e:any): string {
    if (!e) return "Unknown error occurred.";
    if (typeof e === "string") return e;
    if (e.message) return e.message;
    if (e.error_description) return e.error_description;
    if (e.msg) return e.msg;
    if (e.status) return `Error (status ${e.status}): ${e.statusText || e.code || "request failed"}. This usually means the email is already registered, or Supabase email confirmation is blocking sign-up. Check Authentication → Users in your Supabase dashboard.`;
    try { return JSON.stringify(e); } catch { return "Something went wrong. Check the browser console for details."; }
  }

  return (
    <div style={s.page}>
      <div style={s.logo}>
        <div style={s.icon}>⚡</div>
        <div>
          <div style={s.title}>Hero App</div>
          <div style={s.sub}>Smart Life OS + Civic Guardian</div>
        </div>
      </div>

      <div style={s.card} className="fade-up">
        <div style={s.tabs}>
          {(["login","register"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setInfo(""); }}
              style={{ ...s.tab, ...(mode===m?s.tabOn:{}) }}>
              {m==="login"?"Sign In":"Register"}
            </button>
          ))}
        </div>

        {mode==="register" && <>
          <Field label="FULL NAME" value={name} set={setName} placeholder="e.g. Ravi Kumar" />
          <Field label="USERNAME"  value={user} set={setUser} placeholder="e.g. ravikumar" />
        </>}
        <Field label="EMAIL"    value={email} set={setEmail} placeholder="you@email.com" type="email" />
        <Field label="PASSWORD" value={pass}  set={setPass}  placeholder="Min 6 characters" type="password" onEnter={submit} />

        {error && <div style={s.err}>⚠️ {error}</div>}
        {info  && <div style={s.info}>✅ {info}</div>}

        <button onClick={submit} disabled={busy} style={s.btn}>
          {busy ? <span className="spinner" /> : (mode==="login"?"Sign In →":"Create Account →")}
        </button>

        <p style={s.hint}>
          {mode==="login" ? "No account? " : "Have an account? "}
          <span onClick={() => { setMode(mode==="login"?"register":"login"); setError(""); setInfo(""); }} style={s.link}>
            {mode==="login"?"Register":"Sign in"}
          </span>
        </p>
      </div>

      <div style={s.features}>
        {["🧠 AI Tasks","🔥 Habits","🗺️ Civic Map","🎯 Goals","🎤 Voice"].map(f => (
          <div key={f} style={s.featPill}>{f}</div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder, type="text", onEnter }: any) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ color:C.gray, fontSize:11, fontWeight:700, letterSpacing:1, display:"block", marginBottom:6 }}>{label}</label>
      <input type={type} value={value} onChange={e=>set(e.target.value)} placeholder={placeholder}
        onKeyDown={e => e.key==="Enter" && onEnter?.()}
        style={{ width:"100%", background:C.surfaceHi, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.white, fontSize:14, outline:"none", boxSizing:"border-box" }}
        onFocus={e=>e.target.style.borderColor=C.violet}
        onBlur={e=>e.target.style.borderColor=C.border} />
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  page:  { minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, gap:24 },
  logo:  { display:"flex", alignItems:"center", gap:12 },
  icon:  { background:`linear-gradient(135deg,${C.violet},${C.blue})`, borderRadius:12, width:48, height:48, fontSize:24, display:"flex", alignItems:"center", justifyContent:"center" },
  title: { color:C.white, fontWeight:900, fontSize:22, letterSpacing:-0.5 },
  sub:   { color:C.gray, fontSize:12 },
  card:  { background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, padding:28, width:"100%", maxWidth:420 },
  tabs:  { display:"flex", background:C.bg, borderRadius:10, padding:4, marginBottom:24 },
  tab:   { flex:1, background:"none", border:"none", color:C.gray, padding:"9px 0", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer" },
  tabOn: { background:C.surfaceHi, color:C.white },
  err:   { background:"#EF444422", border:"1px solid #EF444455", color:C.red, borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14 },
  info:  { background:"#10B98122", border:"1px solid #10B98155", color:C.green, borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14 },
  btn:   { width:"100%", background:C.violet, color:C.white, border:"none", borderRadius:10, padding:"13px 0", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginTop:4 },
  hint:  { color:C.gray, fontSize:13, textAlign:"center", marginTop:16 },
  link:  { color:C.violetLt, cursor:"pointer", fontWeight:700 },
  features: { display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", maxWidth:420 },
  featPill: { background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:"6px 12px", fontSize:11, color:C.gray },
};