-- Add missing columns to document_chunks
ALTER TABLE `document_chunks` ADD COLUMN `companyCik` varchar(10) DEFAULT NULL;
ALTER TABLE `document_chunks` ADD COLUMN `documentName` varchar(512) DEFAULT NULL;

-- Update companyCik from companyId by joining with companies table
UPDATE `document_chunks` dc
JOIN `companies` c ON dc.companyId = c.id
SET dc.companyCik = c.cik
WHERE dc.companyCik IS NULL;

-- Add companyCik to chat_sessions
ALTER TABLE `chat_sessions` ADD COLUMN `companyCik` varchar(10) DEFAULT NULL;

-- Update companyCik from companyId
UPDATE `chat_sessions` cs
JOIN `companies` c ON cs.companyId = c.id
SET cs.companyCik = c.cik
WHERE cs.companyCik IS NULL;

-- Add missing tables
CREATE TABLE IF NOT EXISTS `emailSignups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `source` varchar(64) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emailSignups_email_unique` (`email`)
);

CREATE TABLE IF NOT EXISTS `watchlistItems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `companyCik` varchar(10) NOT NULL,
  `alertsEnabled` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `userAlerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` varchar(32) NOT NULL,
  `title` varchar(256) NOT NULL,
  `message` text,
  `companyCik` varchar(10) DEFAULT NULL,
  `isRead` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Add missing user columns
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(256) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `stripeCustomerId` varchar(256) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `stripeSubscriptionId` varchar(256) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `subscriptionTier` enum('free','pro','enterprise') NOT NULL DEFAULT 'free';
ALTER TABLE `users` ADD COLUMN `subscriptionStatus` varchar(32) DEFAULT 'none';
