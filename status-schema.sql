CREATE TABLE IF NOT EXISTS public_checks (
  scheduled_at INTEGER PRIMARY KEY,
  report TEXT NOT NULL CHECK (json_valid(report))
);
