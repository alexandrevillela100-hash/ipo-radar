CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cik` varchar(10) NOT NULL,
	`name` varchar(512) NOT NULL,
	`ticker` varchar(20),
	`exchange` varchar(20),
	`sic` varchar(10),
	`sicDescription` varchar(256),
	`stateOfIncorporation` varchar(10),
	`businessAddress` text,
	`businessCity` varchar(128),
	`businessState` varchar(10),
	`businessZip` varchar(20),
	`fiscalYearEnd` varchar(4),
	`entityType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_cik_unique` UNIQUE(`cik`)
);
--> statement-breakpoint
CREATE TABLE `emailSignups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailSignups_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailSignups_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `filings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessionNumber` varchar(25) NOT NULL,
	`companyCik` varchar(10) NOT NULL,
	`formType` varchar(10) NOT NULL,
	`filingDate` varchar(10) NOT NULL,
	`primaryDocument` varchar(256),
	`primaryDocDescription` varchar(512),
	`filingUrl` text,
	`filingStatus` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filings_id` PRIMARY KEY(`id`),
	CONSTRAINT `filings_accessionNumber_unique` UNIQUE(`accessionNumber`)
);
--> statement-breakpoint
CREATE TABLE `userAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text,
	`companyCik` varchar(10),
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyCik` varchar(10) NOT NULL,
	`alertsEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','pro','enterprise') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` varchar(32) DEFAULT 'none';