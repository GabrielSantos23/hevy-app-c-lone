CREATE TABLE `account` (
	`id` integer PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'signed_out' NOT NULL,
	`user_id` text,
	`email` text,
	`last_sync_at` integer
);
--> statement-breakpoint
CREATE TABLE `dismissed_health_workout` (
	`hk_uuid` text PRIMARY KEY NOT NULL,
	`dismissed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_pt` text,
	`type` text NOT NULL,
	`equipment` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text DEFAULT '[]' NOT NULL,
	`bodyweight_factor` real DEFAULT 0 NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`source` text,
	`source_id` text,
	`instructions` text,
	`import_batch_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_name_idx` ON `exercise` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_source_idx` ON `exercise` (`source`,`source_id`);--> statement-breakpoint
CREATE TABLE `folder` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `health_link` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`hk_uuid` text NOT NULL,
	`activity_type` text NOT NULL,
	`hk_start` integer NOT NULL,
	`hk_end` integer NOT NULL,
	`active_energy_kcal` real,
	`avg_hr` real,
	`max_hr` real,
	`hr_samples` text,
	`link_mode` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_link_workout_id_unique` ON `health_link` (`workout_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `health_link_hk_uuid_unique` ON `health_link` (`hk_uuid`);--> statement-breakpoint
CREATE TABLE `import_batch` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`file_name` text NOT NULL,
	`imported_at` integer NOT NULL,
	`workouts_count` integer DEFAULT 0 NOT NULL,
	`exercises_count` integer DEFAULT 0 NOT NULL,
	`measurements_count` integer DEFAULT 0 NOT NULL,
	`reverted_at` integer
);
--> statement-breakpoint
CREATE TABLE `measurement` (
	`id` text PRIMARY KEY NOT NULL,
	`measured_at` integer NOT NULL,
	`weight_kg` real,
	`fat_percent` real,
	`neck_cm` real,
	`shoulder_cm` real,
	`chest_cm` real,
	`left_bicep_cm` real,
	`right_bicep_cm` real,
	`left_forearm_cm` real,
	`right_forearm_cm` real,
	`abdomen_cm` real,
	`waist_cm` real,
	`hips_cm` real,
	`left_thigh_cm` real,
	`right_thigh_cm` real,
	`left_calf_cm` real,
	`right_calf_cm` real,
	`import_batch_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `measurement_date_idx` ON `measurement` (`measured_at`);--> statement-breakpoint
CREATE TABLE `personal_record` (
	`exercise_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`workout_set_id` text NOT NULL,
	`achieved_at` integer NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_set_id`) REFERENCES `workout_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_record_pk` ON `personal_record` (`exercise_id`,`kind`);--> statement-breakpoint
CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text,
	`name` text NOT NULL,
	`notes` text,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`folder_id`) REFERENCES `folder`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `routine_folder_idx` ON `routine` (`folder_id`,`position`);--> statement-breakpoint
CREATE TABLE `routine_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`superset_group` integer,
	`rest_seconds` integer,
	`notes` text,
	`volume_doubling` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_exercise_routine_idx` ON `routine_exercise` (`routine_id`,`position`);--> statement-breakpoint
CREATE TABLE `routine_set` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_s` integer,
	`distance_m` real,
	`custom_metric` real,
	`rep_min` integer,
	`rep_max` integer,
	`target_rpe` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_set_exercise_idx` ON `routine_set` (`routine_exercise_id`,`position`);--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text,
	`name` text NOT NULL,
	`notes` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`status` text NOT NULL,
	`exported_hk_uuid` text,
	`import_batch_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_started_idx` ON `workout` (`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_single_active_idx` ON `workout` (`status`) WHERE status = 'in_progress' and deleted_at is null;--> statement-breakpoint
CREATE TABLE `workout_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`superset_group` integer,
	`rest_seconds` integer,
	`notes` text,
	`volume_doubling` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercise_workout_idx` ON `workout_exercise` (`workout_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_exercise_exercise_idx` ON `workout_exercise` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_set` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_s` integer,
	`distance_m` real,
	`custom_metric` real,
	`rpe` real,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_set_exercise_idx` ON `workout_set` (`workout_exercise_id`,`position`);