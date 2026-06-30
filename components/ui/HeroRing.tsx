"use client";
import { COLORS as C } from "@/lib/constants";

export default function HeroRing({ score, size=120 }: { score:number; size?:number }) {
  const r = size/2 - 10;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  const color = score>70 ? C.green : score>40 ? C.amber : C.violet;

  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{ transition:"stroke-dasharray 1s ease" }} />
      <text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={C.white} fontSize={size/5} fontWeight="900"
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        {score}
      </text>
      <text x={size/2} y={size/2+size/7} textAnchor="middle" dominantBaseline="middle" fill={C.gray} fontSize={size/12}
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        HERO SCORE
      </text>
    </svg>
  );
}
