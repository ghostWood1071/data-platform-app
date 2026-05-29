CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");

INSERT INTO "users" (
  "username",
  "password_hash",
  "full_name",
  "email",
  "role",
  "status"
)
VALUES (
  'admin',
  'scrypt$16384$8$1$data-platform-default-admin$368add8fa5e8e5cb808fe5ad3caa36cc6f6811369998776eb4c64646bf829d52bfa298903720d74a3c55b195a0db928a36a2db3e2fcd6bd8b5562628a1d2c1f8',
  'Administrator',
  'admin@platform.local',
  'platform_admin',
  'active'
)
ON CONFLICT ("username") DO NOTHING;
