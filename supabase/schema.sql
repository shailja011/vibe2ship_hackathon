-- ═══════════════════════════════════════════════════════════════
--  HERO APP — Full Database Schema
--  Paste into: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

create type issue_status   as enum ('reported','verified','in-progress','resolved');
create type issue_category as enum ('Pothole','Street Light','Garbage','Water Leak','Broken Road','Encroachment','Other');
create type severity_level as enum ('low','medium','high');
create type badge_name     as enum ('Newcomer','Reporter','Watchdog','Guardian','Hero');
create type priority_level as enum ('high','medium','low');

-- ── Profiles ──────────────────────────────────────────────────
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  full_name       text not null default '',
  avatar_url      text,
  points          integer not null default 0,
  badge           badge_name not null default 'Newcomer',
  reports_count   integer not null default 0,
  resolved_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Tasks ─────────────────────────────────────────────────────
create table tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  description text,
  priority    priority_level not null default 'medium',
  category    text not null default 'Work',
  done        boolean not null default false,
  due_date    date,
  reminder    boolean not null default false,
  points      integer not null default 20,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Habits ────────────────────────────────────────────────────
create table habits (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  name             text not null,
  icon             text not null default '✅',
  target           integer not null default 1,
  unit             text not null default 'time',
  streak           integer not null default 0,
  completed_today  boolean not null default false,
  history          integer[] not null default '{}',
  last_completed   date,
  created_at       timestamptz not null default now()
);

-- ── Goals ─────────────────────────────────────────────────────
create table goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  title           text not null,
  category        text not null default 'Personal',
  deadline        date not null,
  progress        integer not null default 0,
  milestones      text[] not null default '{}',
  milestones_done boolean[] not null default '{}',
  created_at      timestamptz not null default now()
);

-- ── Calendar Events ───────────────────────────────────────────
create table calendar_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  color      text not null default '#7C3AED',
  task_id    uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Issues (civic) ────────────────────────────────────────────
create table issues (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  category      issue_category not null default 'Other',
  severity      severity_level not null default 'medium',
  status        issue_status not null default 'reported',
  image_url     text,
  video_url     text,
  latitude      double precision not null,
  longitude     double precision not null,
  address       text,
  upvotes       integer not null default 0,
  verified_count integer not null default 0,
  ai_suggestion text,
  reported_by   uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Votes (upvote) ────────────────────────────────────────────
create table votes (
  id         uuid primary key default uuid_generate_v4(),
  issue_id   uuid not null references issues(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(issue_id, user_id)
);

-- ── Verifications (community confirms issue is real) ──────────
create table verifications (
  id         uuid primary key default uuid_generate_v4(),
  issue_id   uuid not null references issues(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(issue_id, user_id)
);

-- ── Notifications ─────────────────────────────────────────────
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  issue_id   uuid references issues(id) on delete set null,
  task_id    uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
--  INDEXES
-- ═══════════════════════════════════════════════════════════════
create index idx_tasks_user        on tasks(user_id);
create index idx_tasks_due         on tasks(due_date);
create index idx_habits_user       on habits(user_id);
create index idx_goals_user        on goals(user_id);
create index idx_events_user       on calendar_events(user_id);
create index idx_issues_status     on issues(status);
create index idx_issues_category   on issues(category);
create index idx_issues_location   on issues(latitude, longitude);
create index idx_issues_created    on issues(created_at desc);
create index idx_votes_issue       on votes(issue_id);
create index idx_verif_issue       on verifications(issue_id);
create index idx_notifs_user       on notifications(user_id, read);

-- ═══════════════════════════════════════════════════════════════
--  FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tasks_updated_at    before update on tasks    for each row execute function handle_updated_at();
create trigger issues_updated_at   before update on issues   for each row execute function handle_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function handle_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id, username, full_name, avatar_url) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Badge calculator
create or replace function recalculate_badge(p integer) returns badge_name language plpgsql as $$
begin
  if p>=600 then return 'Hero';
  elsif p>=300 then return 'Guardian';
  elsif p>=150 then return 'Watchdog';
  elsif p>=50  then return 'Reporter';
  else return 'Newcomer'; end if;
end; $$;

-- Award points
create or replace function award_points(p_user_id uuid, p_points integer)
returns void language plpgsql security definer as $$
begin
  update profiles set points=points+p_points, badge=recalculate_badge(points+p_points) where id=p_user_id;
end; $$;

-- Complete task → award points
create or replace function handle_task_complete()
returns trigger language plpgsql security definer as $$
begin
  if new.done=true and old.done=false then
    perform award_points(new.user_id, new.points);
  elsif new.done=false and old.done=true then
    perform award_points(new.user_id, -new.points);
  end if;
  return new;
end; $$;

create trigger on_task_complete after update of done on tasks for each row execute function handle_task_complete();

-- Complete habit → award points + update streak
create or replace function handle_habit_toggle()
returns trigger language plpgsql security definer as $$
begin
  if new.completed_today=true and old.completed_today=false then
    perform award_points(new.user_id, 20);
  elsif new.completed_today=false and old.completed_today=true then
    perform award_points(new.user_id, -20);
  end if;
  return new;
end; $$;

create trigger on_habit_toggle after update of completed_today on habits for each row execute function handle_habit_toggle();

-- Upvote handler
create or replace function handle_upvote(p_issue_id uuid, p_user_id uuid)
returns json language plpgsql security definer as $$
declare owner uuid;
begin
  insert into votes(issue_id,user_id) values(p_issue_id,p_user_id) on conflict do nothing;
  if found then
    update issues set upvotes=upvotes+1 where id=p_issue_id returning reported_by into owner;
    perform award_points(p_user_id,5);
    if owner<>p_user_id then perform award_points(owner,10); end if;
    return json_build_object('success',true,'action','voted');
  else
    return json_build_object('success',false,'action','already_voted');
  end if;
end; $$;

-- Community verification handler
create or replace function handle_verify(p_issue_id uuid, p_user_id uuid)
returns json language plpgsql security definer as $$
begin
  insert into verifications(issue_id,user_id) values(p_issue_id,p_user_id) on conflict do nothing;
  if found then
    update issues set verified_count=verified_count+1 where id=p_issue_id;
    -- Auto-promote to 'verified' status after 5 community verifications
    update issues set status='verified' where id=p_issue_id and status='reported' and verified_count>=5;
    perform award_points(p_user_id,8);
    return json_build_object('success',true);
  else
    return json_build_object('success',false,'action','already_verified');
  end if;
end; $$;

-- Status change → award points + notify
create or replace function handle_status_change()
returns trigger language plpgsql security definer as $$
begin
  if new.status='resolved' and old.status<>'resolved' then
    perform award_points(new.reported_by,100);
    update profiles set resolved_count=resolved_count+1 where id=new.reported_by;
    insert into notifications(user_id,title,body,issue_id)
    values(new.reported_by,'🎉 Issue Resolved!','Your issue "'||new.title||'" was resolved. +100 pts!',new.id);
  end if;
  return new;
end; $$;

create trigger on_issue_status_change after update of status on issues for each row execute function handle_status_change();

-- New issue → award points + increment reports
create or replace function handle_new_issue()
returns trigger language plpgsql security definer as $$
begin
  update profiles set reports_count=reports_count+1 where id=new.reported_by;
  perform award_points(new.reported_by,50);
  return new;
end; $$;

create trigger on_new_issue after insert on issues for each row execute function handle_new_issue();

-- Goal milestone toggle → recalc progress + award points
create or replace function recalc_goal_progress(p_goal_id uuid)
returns void language plpgsql security definer as $$
declare
  total int; done_count int;
begin
  select array_length(milestones,1), (select count(*) from unnest(milestones_done) d where d=true)
  into total, done_count
  from goals where id=p_goal_id;
  if total > 0 then
    update goals set progress = round((done_count::numeric/total)*100) where id=p_goal_id;
  end if;
end; $$;

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table profiles         enable row level security;
alter table tasks            enable row level security;
alter table habits           enable row level security;
alter table goals            enable row level security;
alter table calendar_events  enable row level security;
alter table issues           enable row level security;
alter table votes            enable row level security;
alter table verifications    enable row level security;
alter table notifications    enable row level security;

create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid()=id);

create policy "tasks_all" on tasks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "habits_all" on habits for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "goals_all" on goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "events_all" on calendar_events for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "issues_select" on issues for select using (true);
create policy "issues_insert" on issues for insert with check (auth.uid()=reported_by);
create policy "issues_update" on issues for update using (true);
create policy "issues_delete" on issues for delete using (auth.uid()=reported_by);

create policy "votes_select" on votes for select using (true);
create policy "votes_insert" on votes for insert with check (auth.uid()=user_id);

create policy "verif_select" on verifications for select using (true);
create policy "verif_insert" on verifications for insert with check (auth.uid()=user_id);

create policy "notifs_select" on notifications for select using (auth.uid()=user_id);
create policy "notifs_update" on notifications for update using (auth.uid()=user_id);

-- ═══════════════════════════════════════════════════════════════
--  STORAGE
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets(id,name,public) values('issue-media','issue-media',true) on conflict do nothing;
create policy "media_select" on storage.objects for select using (bucket_id='issue-media');
create policy "media_insert" on storage.objects for insert with check (bucket_id='issue-media' and auth.role()='authenticated');

-- ═══════════════════════════════════════════════════════════════
--  REALTIME
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table issues;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table habits;
alter publication supabase_realtime add table notifications;

-- ═══════════════════════════════════════════════════════════════
--  SEED DATA (optional — sample issues to demo with)
-- ═══════════════════════════════════════════════════════════════
-- Run this AFTER you've registered your first user, replacing the UUID below
-- with your own user id from: select id from profiles limit 1;
--
-- insert into issues (title, description, category, severity, status, latitude, longitude, upvotes, reported_by)
-- values
--   ('Deep pothole on Main Road','Dangerous pothole causing accidents','Pothole','high','verified',28.985,77.706,34,'YOUR-USER-ID'),
--   ('Street lights not working','3 lights out for 2 weeks','Street Light','high','in-progress',28.989,77.712,56,'YOUR-USER-ID');
