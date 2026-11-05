-- Khung dữ liệu leaderboard. Chạy trong Supabase SQL Editor sau khi tạo project.
create table if not exists public.student_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  room_code text not null default 'N5-01',
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);

alter table public.student_scores enable row level security;

-- Đọc bảng xếp hạng công khai cho người chơi.
create policy "Scores are readable"
on public.student_scores for select
to anon, authenticated
using (true);

-- Chưa mở quyền insert/update công khai ở bản khởi tạo.
-- Trước khi phát hành thật, hãy dùng Supabase Auth + RPC/Edge Function
-- để xác thực điểm, tránh học viên tự sửa XP từ trình duyệt.
