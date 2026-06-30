"use client";
import { useEffect, useRef } from "react";
import type { Issue } from "@/types";
import { getCat, STATUS_META } from "@/lib/constants";

export default function MapView({ issues, userLat, userLng, selectedIssue, onPinClick }: {
  issues: Issue[]; userLat: number|null; userLng: number|null;
  selectedIssue: Issue|null; onPinClick: (i: Issue|null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string,any>>(new Map());
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(containerRef.current!, {
        center: [userLat ?? 28.986, userLng ?? 77.708], zoom: 14, zoomControl: true, attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);
      mapRef.current = map;
    });
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then(L => {
      const map = mapRef.current;
      const existing = new Set(markersRef.current.keys());
      issues.forEach(issue => {
        const cat = getCat(issue.category);
        const status = STATUS_META[issue.status];
        const isSel = selectedIssue?.id === issue.id;
        const html = `<div style="width:${isSel?44:36}px;height:${isSel?44:36}px;background:${issue.status==="resolved"?"#374151":cat.color};border-radius:50%;border:${isSel?"3px solid #fff":"2px solid rgba(255,255,255,.3)"};display:flex;align-items:center;justify-content:center;font-size:${isSel?20:16}px;box-shadow:0 2px 12px rgba(0,0,0,.5)"></div>`;
        const icon = L.divIcon({ html, className:"", iconSize:[isSel?44:36,isSel?44:36], iconAnchor:[isSel?22:18,isSel?22:18] });
        if (markersRef.current.has(issue.id)) {
          markersRef.current.get(issue.id).setIcon(icon);
          existing.delete(issue.id);
        } else {
          const marker = L.marker([issue.latitude, issue.longitude], { icon }).addTo(map)
            .bindPopup(`<div style="min-width:180px"><div style="font-weight:800;font-size:14px;margin-bottom:6px">${cat.icon} ${issue.title}</div><div style="font-size:12px;color:#94A3B8;margin-bottom:8px">${(issue.description||"").slice(0,80)}</div><span style="background:${status.bg};color:${status.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${status.label}</span></div>`)
            .on("click", () => onPinClick(issue));
          markersRef.current.set(issue.id, marker);
        }
      });
      existing.forEach(id => { markersRef.current.get(id)?.remove(); markersRef.current.delete(id); });
    });
  }, [issues, selectedIssue]);

  useEffect(() => {
    if (!mapRef.current || !userLat || !userLng) return;
    import("leaflet").then(L => {
      userMarkerRef.current?.remove();
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3B82F6;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3)"></div>`,
        className: "", iconSize:[16,16], iconAnchor:[8,8],
      });
      userMarkerRef.current = L.marker([userLat, userLng], { icon, zIndexOffset: 1000 }).addTo(mapRef.current).bindPopup("<b>📍 You are here</b>");
    });
  }, [userLat, userLng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width:"100%", height:"100%", minHeight:300 }} />
    </>
  );
}
