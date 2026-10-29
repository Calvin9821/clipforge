ALTER TABLE `users` ADD `disabled` integer DEFAULT 0 NOT NULL;
CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_user_id` text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  `action` text NOT NULL,
  `target_type` text NOT NULL,
  `target_id` text NOT NULL,
  `before` text,
  `after` text,
  `reason` text,
  `ip` text,
  `user_agent` text,
  `created_at` integer
);
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);
