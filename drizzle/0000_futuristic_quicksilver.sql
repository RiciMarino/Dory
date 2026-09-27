CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`people` integer NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`capacity` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
