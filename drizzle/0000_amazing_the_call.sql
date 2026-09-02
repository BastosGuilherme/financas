CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`balance_cents` integer DEFAULT 0 NOT NULL,
	`closing_day` integer,
	`due_day` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_household` ON `accounts` (`household_id`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`category` text NOT NULL,
	`month` text NOT NULL,
	`limit_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_budgets_household_category_month` ON `budgets` (`household_id`,`category`,`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_categories_household` ON `categories` (`household_id`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_members_household_user` ON `members` (`household_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_members_household` ON `members` (`household_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_date` text NOT NULL,
	`direction` text,
	`recurring` integer DEFAULT false NOT NULL,
	`installment` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_household_date` ON `transactions` (`household_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_household_category` ON `transactions` (`household_id`,`category`);