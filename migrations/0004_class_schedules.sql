CREATE TABLE IF NOT EXISTS class_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price NUMERIC NOT NULL DEFAULT 30000 CHECK (price >= 0),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  meeting_id TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_scheduled_at ON class_schedules(scheduled_at);

CREATE TABLE IF NOT EXISTS class_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_schedule_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  vnp_txn_ref TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_schedule_id ON class_enrollments(class_schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user_id ON class_enrollments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_enrollments_vnp_txn_ref
  ON class_enrollments(vnp_txn_ref)
  WHERE vnp_txn_ref IS NOT NULL;
