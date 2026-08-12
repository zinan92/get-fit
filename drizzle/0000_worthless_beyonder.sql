CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`request_id` text,
	`plan_hash` text,
	`metadata_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checkin` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`plan_day_id` text NOT NULL,
	`local_date` text NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkin_client_date_item_idx` ON `checkin` (`client_id`,`local_date`,`item_id`);--> statement-breakpoint
CREATE TABLE `client` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_auth` (
	`client_id` text PRIMARY KEY NOT NULL,
	`openid_hash` text NOT NULL,
	`openid_ciphertext` text,
	`session_hash` text,
	`session_expires_at` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_auth_openid_hash_idx` ON `client_auth` (`openid_hash`);--> statement-breakpoint
CREATE TABLE `coach_account` (
	`id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coach_alert` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`local_date` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`acknowledged_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consent` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`type` text NOT NULL,
	`text_version` text NOT NULL,
	`accepted_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_client_type_idx` ON `consent` (`client_id`,`type`);--> statement-breakpoint
CREATE TABLE `deletion_request` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`requested_at` text NOT NULL,
	`purge_at` text NOT NULL,
	`receipt_hash` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `delivery_log` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`local_date` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider_code` text,
	`status` text NOT NULL,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercise_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contraindications_json` text NOT NULL,
	`cues_json` text NOT NULL,
	`source_version` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kcal_per_100g` real NOT NULL,
	`unit` text NOT NULL,
	`allergens_json` text NOT NULL,
	`source_version` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_job` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`schema_version` text NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`trace_id` text NOT NULL,
	`output_hash` text,
	`operator` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `health_profile` (
	`client_id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`key_version` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`coach_confirmed_at` text,
	`safety_gate` text DEFAULT 'auto_allowed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_hash_idx` ON `invitation` (`token_hash`);--> statement-breakpoint
CREATE TABLE `plan_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_job_id` text NOT NULL,
	`client_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`validation_json` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`rejection_reason` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`generation_job_id`) REFERENCES `generation_job`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_version` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`version_no` integer NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	`change_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_version_client_version_idx` ON `plan_version` (`client_id`,`version_no`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`template_id` text NOT NULL,
	`consent_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wellness_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`local_date` text NOT NULL,
	`pain` text NOT NULL,
	`energy` text NOT NULL,
	`hunger` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wellness_client_date_idx` ON `wellness_feedback` (`client_id`,`local_date`);