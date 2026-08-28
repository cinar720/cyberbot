-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "suggestionNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "messageId" TEXT,
    "channelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "transcript" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suggestions_guildId_suggestionNumber_key" ON "suggestions"("guildId", "suggestionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_guildId_ticketNumber_key" ON "tickets"("guildId", "ticketNumber");
