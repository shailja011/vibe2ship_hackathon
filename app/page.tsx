"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthCtx } from "@/components/auth/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { userId, loading } = useAuthCtx();

  useEffect(() => {
    if(!loading) router.replace(userId ? "/dashboard" : "/auth/login");
  }, [userId, loading, router]);

  return (
    <div style={{ minHeight:"100vh", background:"#080C14", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚡</div>
        <span className="spinner" />
      </div>
    </div>
  );
}
