CREATE TABLE `clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`item_id` text NOT NULL,
	`at` text NOT NULL,
	`country` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `clicks_page_at` ON `clicks` (`page_id`,`at`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`featured` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_page` ON `items` (`page_id`,`position`);--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`at` text NOT NULL,
	`source` text NOT NULL,
	`country` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_views_page_at` ON `page_views` (`page_id`,`at`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`handle` text NOT NULL,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_key` text,
	`avatar_type` text,
	`theme` text DEFAULT 'light' NOT NULL,
	`buttons` text DEFAULT 'rounded' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`signup_enabled` integer DEFAULT false NOT NULL,
	`signup_heading` text DEFAULT '' NOT NULL,
	`signup_ask_details` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_handle` ON `pages` (`handle`);--> statement-breakpoint
CREATE INDEX `pages_user` ON `pages` (`user_id`);--> statement-breakpoint
CREATE TABLE `signups` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`phone` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signups_page_email` ON `signups` (`page_id`,`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
