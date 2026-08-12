CREATE TABLE `runtime_state` (
	`id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`key_version` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
