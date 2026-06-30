"use client";
export default function Toast({ msg, color="#10B981" }: { msg:string; color?:string }) {
  return (
    <div style={{
      position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
      background:color, color:"#000", padding:"9px 18px", borderRadius:30,
      fontWeight:800, fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,.5)",
      animation:"fadeUp .3s ease both", whiteSpace:"nowrap",
    }}>
      {msg}
    </div>
  );
}
