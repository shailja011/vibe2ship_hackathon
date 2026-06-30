"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { aiCategorizeIssue } from "@/lib/ai";
import { COLORS as C, CAT_META } from "@/lib/constants";
import type { Issue } from "@/types";

export default function ReportModal({ userId, userLat, userLng, onSuccess, onClose }: {
  userId: string; userLat: number|null; userLng: number|null;
  onSuccess: (issue: Issue) => void; onClose: () => void;
}) {
  const [step, setStep] = useState<1|2>(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File|null>(null);
  const [preview, setPreview] = useState<string|null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!title.trim()) { setError("Please enter a title."); return; }
    setError(""); setBusy(true);
    try {
      const data = await aiCategorizeIssue(title, desc);
      setAiResult(data); setCategory(data.category); setStep(2);
    } catch {
      setError("AI analysis failed — choose a category manually.");
      setStep(2);
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!category) { setError("Please select a category."); return; }
    setError(""); setBusy(true);
    try {
      let image_url: string|undefined;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("issue-media").upload(path, imageFile);
        if (!upErr) {
          const { data } = supabase.storage.from("issue-media").getPublicUrl(path);
          image_url = data.publicUrl;
        }
      }
      const { data, error } = await supabase.from("issues").insert({
        title, description: desc, category,
        severity: aiResult?.severity ?? "medium",
        ai_suggestion: aiResult?.suggestion ?? null,
        latitude: userLat ?? 28.986, longitude: userLng ?? 77.708,
        reported_by: userId, image_url,
      }).select("*, reporter:profiles!reported_by(username,full_name,avatar_url)").single();

      if (error) throw new Error(error.message);
      onSuccess(data as Issue);
    } catch (e:any) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal} className="slide-up">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ color:C.violet, fontSize:11, fontWeight:700, letterSpacing:2 }}>STEP {step} OF 2</div>
            <div style={{ color:C.white, fontSize:18, fontWeight:800 }}>{step===1?"Describe the issue":"Confirm & Submit"}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {step===1 && <>
          <Field label="TITLE *" value={title} set={setTitle} placeholder="e.g. Large pothole near bus stop" />
          <div style={{ marginBottom:16 }}>
            <label style={s.label}>DESCRIPTION</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe the problem in detail..." rows={3}
              style={{ ...s.input, resize:"vertical" as const }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={s.label}>PHOTO / VIDEO (optional)</label>
            <div onClick={() => fileRef.current?.click()}
              style={{ background:C.surfaceHi, border:`1.5px dashed ${C.border}`, borderRadius:8, padding:preview?0:"24px 0", textAlign:"center", cursor:"pointer", overflow:"hidden" }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width:"100%", maxHeight:140, objectFit:"cover" }} />
                : <div style={{ color:C.grayDark }}>📷 Tap to add photo or video</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:"none" }} />
          </div>
          {error && <div style={s.err}>⚠ {error}</div>}
          <button onClick={analyze} disabled={busy||!title.trim()}
            style={{ ...s.btn, background: busy||!title.trim() ? C.surfaceHi : `linear-gradient(135deg,${C.violet},${C.blue})` }}>
            {busy ? <span className="spinner" /> : "✨ Analyze with AI →"}
          </button>
        </>}

        {step===2 && <>
          {aiResult && (
            <div style={s.aiBox}>
              <div style={{ color:C.violetLt, fontSize:11, fontWeight:700, marginBottom:8 }}>🤖 AI ANALYSIS</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <span style={{ background:`${C.violet}22`, color:C.violetLt, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                  {CAT_META[aiResult.category]?.icon} {aiResult.category}
                </span>
                <span style={{ background: aiResult.severity==="high"?`${C.red}22`:`${C.amber}22`, color: aiResult.severity==="high"?C.red:C.amber, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                  {aiResult.severity?.toUpperCase()}
                </span>
              </div>
              <div style={{ color:C.gray, fontSize:12 }}>💡 {aiResult.suggestion}</div>
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <label style={s.label}>CONFIRM CATEGORY</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(CAT_META).map(([cat,m]) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ background:category===cat?`${m.color}33`:C.surfaceHi, border:`1.5px solid ${category===cat?m.color:"transparent"}`, borderRadius:8, padding:"6px 10px", color:category===cat?m.color:C.gray, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  {m.icon} {cat}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={s.err}>⚠ {error}</div>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(1)} style={{ flex:1, background:C.surfaceHi, border:"none", color:C.gray, borderRadius:10, padding:"12px 0", fontWeight:700, cursor:"pointer" }}>← Back</button>
            <button onClick={submit} disabled={busy||!category}
              style={{ flex:2, background:busy||!category?C.surfaceHi:`linear-gradient(135deg,${C.violet},${C.blue})`, border:"none", color:C.white, borderRadius:10, padding:"12px 0", fontWeight:800, fontSize:14, cursor:busy||!category?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {busy ? <span className="spinner" /> : "📍 Submit Report"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder }: any) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={s.label}>{label}</label>
      <input value={value} onChange={e=>set(e.target.value)} placeholder={placeholder} style={s.input} />
    </div>
  );
}

const s: Record<string,any> = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16 },
  modal: { background:C.surface, borderRadius:16, width:"100%", maxWidth:480, padding:24, border:`1px solid ${C.border}`, maxHeight:"90vh", overflowY:"auto" },
  closeBtn: { background:C.surfaceHi, border:"none", color:C.gray, borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16 },
  label: { color:C.gray, fontSize:11, fontWeight:700, display:"block", marginBottom:6 },
  input: { width:"100%", background:C.surfaceHi, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.white, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  err: { background:`${C.red}22`, border:`1px solid ${C.red}55`, color:C.red, borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14 },
  btn: { width:"100%", border:"none", color:C.white, borderRadius:10, padding:"13px 0", fontWeight:800, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  aiBox: { background:C.surfaceHi, borderRadius:10, padding:14, marginBottom:16, border:`1px solid ${C.violet}33` },
};
