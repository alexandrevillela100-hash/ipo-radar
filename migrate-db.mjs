import mysql from "mysql2/promise";

async function migrate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Drop tables in correct order (children first)
  const drops = [
    "DROP TABLE IF EXISTS document_chunks",
    "DROP TABLE IF EXISTS chat_sessions",
    "DROP TABLE IF EXISTS watchlistItems",
    "DROP TABLE IF EXISTS userAlerts",
    "DROP TABLE IF EXISTS emailSignups",
    "DROP TABLE IF EXISTS filings",
    "DROP TABLE IF EXISTS companies",
    "DROP TABLE IF EXISTS __drizzle_migrations",
  ];

  for (const stmt of drops) {
    await conn.query(stmt);
    console.log("OK:", stmt);
  }

  // Create companies with SEC EDGAR schema
  await conn.query(`CREATE TABLE companies (
    id int NOT NULL AUTO_INCREMENT,
    cik varchar(10) NOT NULL,
    name varchar(512) NOT NULL,
    ticker varchar(20) DEFAULT NULL,
    exchange varchar(20) DEFAULT NULL,
    sic varchar(10) DEFAULT NULL,
    sicDescription varchar(256) DEFAULT NULL,
    stateOfIncorporation varchar(10) DEFAULT NULL,
    businessAddress text DEFAULT NULL,
    businessCity varchar(128) DEFAULT NULL,
    businessState varchar(10) DEFAULT NULL,
    businessZip varchar(20) DEFAULT NULL,
    fiscalYearEnd varchar(4) DEFAULT NULL,
    entityType varchar(64) DEFAULT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY companies_cik_unique (cik)
  )`);
  console.log("OK: Created companies");

  // Create filings
  await conn.query(`CREATE TABLE filings (
    id int NOT NULL AUTO_INCREMENT,
    companyCik varchar(10) NOT NULL,
    accessionNumber varchar(30) NOT NULL,
    formType varchar(20) NOT NULL,
    filingDate varchar(20) NOT NULL,
    filingUrl varchar(1000) DEFAULT NULL,
    primaryDocDescription varchar(500) DEFAULT NULL,
    filingStatus varchar(20) DEFAULT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY filings_accession_unique (accessionNumber)
  )`);
  console.log("OK: Created filings");

  // Create emailSignups
  await conn.query(`CREATE TABLE emailSignups (
    id int NOT NULL AUTO_INCREMENT,
    email varchar(320) NOT NULL,
    source varchar(64) DEFAULT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY emailSignups_email_unique (email)
  )`);
  console.log("OK: Created emailSignups");

  // Create watchlistItems
  await conn.query(`CREATE TABLE watchlistItems (
    id int NOT NULL AUTO_INCREMENT,
    userId int NOT NULL,
    companyCik varchar(10) NOT NULL,
    alertsEnabled int NOT NULL DEFAULT 1,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
  console.log("OK: Created watchlistItems");

  // Create userAlerts
  await conn.query(`CREATE TABLE userAlerts (
    id int NOT NULL AUTO_INCREMENT,
    userId int NOT NULL,
    type varchar(32) NOT NULL,
    title varchar(256) NOT NULL,
    message text DEFAULT NULL,
    companyCik varchar(10) DEFAULT NULL,
    isRead int NOT NULL DEFAULT 0,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
  console.log("OK: Created userAlerts");

  // Create document_chunks for RAG
  await conn.query(`CREATE TABLE document_chunks (
    id int NOT NULL AUTO_INCREMENT,
    filingId int NOT NULL,
    companyId int NOT NULL,
    chunkIndex int NOT NULL,
    chunkText text NOT NULL,
    sectionLabel varchar(500) DEFAULT NULL,
    tokenCount int DEFAULT NULL,
    companyCik varchar(10) DEFAULT NULL,
    documentName varchar(512) DEFAULT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
  console.log("OK: Created document_chunks");

  // Create chat_sessions
  await conn.query(`CREATE TABLE chat_sessions (
    id int NOT NULL AUTO_INCREMENT,
    companyId int NOT NULL,
    userId int DEFAULT NULL,
    sessionId varchar(64) NOT NULL,
    messages text DEFAULT NULL,
    companyCik varchar(10) DEFAULT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY chat_sessions_sessionId_unique (sessionId)
  )`);
  console.log("OK: Created chat_sessions");

  // Also add missing user columns if they don't exist
  const userAlters = [
    "ALTER TABLE users ADD COLUMN passwordHash varchar(256) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN stripeCustomerId varchar(256) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN stripeSubscriptionId varchar(256) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN subscriptionTier enum('free','pro','enterprise') NOT NULL DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN subscriptionStatus varchar(32) DEFAULT 'none'",
  ];

  for (const stmt of userAlters) {
    try {
      await conn.query(stmt);
      console.log("OK:", stmt.substring(0, 60));
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log("SKIP (exists):", stmt.substring(0, 60));
      } else {
        console.log("ERR:", e.code, e.message.substring(0, 80));
      }
    }
  }

  await conn.end();
  console.log("\nAll tables created successfully!");
}

migrate().catch(console.error);
