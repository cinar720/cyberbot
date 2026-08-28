-- AlterTable
ALTER TABLE "suggestions" ADD COLUMN     "approvalChannelId" TEXT,
ADD COLUMN     "approvalMessageId" TEXT,
ADD COLUMN     "publicationChannelId" TEXT,
ADD COLUMN     "publicationMessageId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
