-- H21 LOCAL DISPOSABLE D1 ONLY. Never applied to a deployed database.
CREATE TABLE IF NOT EXISTS h21_home_documents (
  owner_id TEXT NOT NULL PRIMARY KEY CHECK(length(owner_id) = 36),
  revision TEXT NOT NULL CHECK(length(revision) = 64),
  raw TEXT NOT NULL CHECK(length(CAST(raw AS BLOB)) <= 131072),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS h21_home_receipts (
  owner_id TEXT NOT NULL,
  request_key TEXT NOT NULL CHECK(length(request_key) = 64),
  expected_revision TEXT,
  payload_hash TEXT NOT NULL CHECK(length(payload_hash) = 64),
  resulting_revision TEXT NOT NULL CHECK(length(resulting_revision) = 64),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_id,request_key)
);
CREATE TABLE IF NOT EXISTS h21_home_history (
  owner_id TEXT NOT NULL,
  revision TEXT NOT NULL CHECK(length(revision) = 64),
  raw TEXT NOT NULL CHECK(length(CAST(raw AS BLOB)) <= 131072),
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_id,revision)
);
