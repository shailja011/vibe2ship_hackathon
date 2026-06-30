export const COLORS = {
  bg:       "#080C14",
  surface:  "#0F1520",
  surfaceHi:"#162032",
  border:   "#1A2840",
  violet:   "#7C3AED",
  violetLt: "#A78BFA",
  green:    "#10B981",
  amber:    "#F59E0B",
  red:      "#EF4444",
  blue:     "#3B82F6",
  white:    "#F8FAFC",
  gray:     "#94A3B8",
  grayDark: "#334155",
};

export const CAT_META: Record<string,{icon:string;color:string}> = {
  "Pothole":      {icon:"🕳️",color:"#EF4444"},
  "Street Light": {icon:"💡",color:"#F59E0B"},
  "Garbage":      {icon:"🗑️",color:"#10B981"},
  "Water Leak":   {icon:"💧",color:"#3B82F6"},
  "Broken Road":  {icon:"🚧",color:"#F97316"},
  "Encroachment": {icon:"🏗️",color:"#8B5CF6"},
  "Other":        {icon:"📌",color:"#6B7280"},
};

export const STATUS_META: Record<string,{label:string;color:string;bg:string}> = {
  "reported":    {label:"Reported",    color:"#F59E0B",bg:"#FEF3C720"},
  "verified":    {label:"Verified",    color:"#3B82F6",bg:"#DBEAFE20"},
  "in-progress": {label:"In Progress", color:"#8B5CF6",bg:"#EDE9FE20"},
  "resolved":    {label:"Resolved",    color:"#10B981",bg:"#D1FAE520"},
};

export const PRIORITY_META: Record<string,{color:string;label:string;bg:string}> = {
  high:   {color:"#EF4444",label:"High",   bg:"#EF444420"},
  medium: {color:"#F59E0B",label:"Medium", bg:"#F59E0B20"},
  low:    {color:"#10B981",label:"Low",    bg:"#10B98120"},
};

export const BADGES = [
  {name:"Newcomer", min:0,   icon:"🌱"},
  {name:"Reporter", min:50,  icon:"📣"},
  {name:"Watchdog", min:150, icon:"🐕"},
  {name:"Guardian", min:300, icon:"🛡️"},
  {name:"Hero",     min:600, icon:"⚡"},
];

export function getBadge(pts:number) {
  return [...BADGES].reverse().find(b=>pts>=b.min)??BADGES[0];
}

export function timeAgo(d:string) {
  const days = Math.floor((Date.now()-new Date(d).getTime())/86400000);
  if(days===0) return "Today";
  if(days===1) return "Yesterday";
  return `${days}d ago`;
}

export function getCat(cat:string) {
  return CAT_META[cat]??CAT_META["Other"];
}
