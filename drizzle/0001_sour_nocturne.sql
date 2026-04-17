CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`messages` json DEFAULT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ticker` varchar(20),
	`exchange` varchar(50),
	`status` enum('upcoming','priced','trading','withdrawn') NOT NULL DEFAULT 'upcoming',
	`industry` varchar(255),
	`sector` varchar(255),
	`description` text,
	`headquarters` varchar(255),
	`founded` varchar(10),
	`ceo` varchar(255),
	`employees` varchar(50),
	`website` varchar(500),
	`logoUrl` varchar(1000),
	`priceLow` decimal(10,2),
	`priceHigh` decimal(10,2),
	`priceActual` decimal(10,2),
	`sharesOffered` bigint,
	`offeringSize` bigint,
	`marketCap` bigint,
	`expectedDate` timestamp,
	`pricedDate` timestamp,
	`revenue` bigint,
	`netIncome` bigint,
	`fiscalYear` varchar(10),
	`leadUnderwriter` varchar(500),
	`slug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filingId` int NOT NULL,
	`companyId` int NOT NULL,
	`chunkIndex` int NOT NULL,
	`chunkText` text NOT NULL,
	`sectionLabel` varchar(500),
	`tokenCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`documentType` varchar(50) NOT NULL,
	`documentName` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` bigint,
	`filingStatus` enum('processing','ready','error') NOT NULL DEFAULT 'processing',
	`chunkCount` int DEFAULT 0,
	`errorMessage` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `filings_id` PRIMARY KEY(`id`)
);
