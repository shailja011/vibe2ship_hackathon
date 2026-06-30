export type BadgeName = "Newcomer"|"Reporter"|"Watchdog"|"Guardian"|"Hero";
export type IssueStatus = "reported"|"verified"|"in-progress"|"resolved";
export type IssueCategory = "Pothole"|"Street Light"|"Garbage"|"Water Leak"|"Broken Road"|"Encroachment"|"Other";
export type Priority = "high"|"medium"|"low";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string|null;
  points: number;
  badge: BadgeName;
  reports_count: number;
  resolved_count: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string|null;
  priority: Priority;
  category: string;
  done: boolean;
  due_date: string|null;
  reminder: boolean;
  points: number;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target: number;
  unit: string;
  streak: number;
  completed_today: boolean;
  history: number[];
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  deadline: string;
  progress: number;
  milestones: string[];
  milestones_done: boolean[];
  created_at: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string|null;
  category: IssueCategory;
  severity: "low"|"medium"|"high";
  status: IssueStatus;
  image_url: string|null;
  latitude: number;
  longitude: number;
  address: string|null;
  upvotes: number;
  ai_suggestion: string|null;
  reported_by: string;
  created_at: string;
  reporter?: { username:string; full_name:string; avatar_url:string|null };
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  color: string;
  task_id: string|null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
