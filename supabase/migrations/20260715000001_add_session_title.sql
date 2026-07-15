-- Optional display title for a session (defaults to topic)
alter table sessions add column if not exists title text;
-- retrigger
