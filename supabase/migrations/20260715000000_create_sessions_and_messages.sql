create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table sessions enable row level security;
alter table messages enable row level security;

create policy "users own their sessions"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users own their messages"
  on messages for all
  using (
    session_id in (
      select id from sessions where user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select id from sessions where user_id = auth.uid()
    )
  );

create function update_session_updated_at()
returns trigger language plpgsql as $$
begin
  update sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$;

create trigger on_message_insert
  after insert on messages
  for each row execute function update_session_updated_at();
