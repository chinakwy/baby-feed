CREATE TABLE "DeletedRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "babyId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "deletedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeletedRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeletedRecord_babyId_userId_fkey" FOREIGN KEY ("babyId", "userId") REFERENCES "Baby" ("id", "createdBy") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DeletedRecord_userId_deletedAt_idx" ON "DeletedRecord"("userId", "deletedAt");
