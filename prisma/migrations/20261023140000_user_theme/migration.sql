-- Account appearance preference only, no historical records are changed.
ALTER TABLE "User" ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT 'blue';
