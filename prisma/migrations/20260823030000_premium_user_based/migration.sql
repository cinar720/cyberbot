-- Create Premium table for user-based premium system
CREATE TABLE IF NOT EXISTS "premiums" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premiums_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for one premium per user
CREATE UNIQUE INDEX IF NOT EXISTS "premiums_userId_key" ON "premiums"("userId");

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "premiums_active_idx" ON "premiums"("active");
CREATE INDEX IF NOT EXISTS "premiums_expiresAt_idx" ON "premiums"("expiresAt");

-- Add foreign key constraint to users table
DO $$ BEGIN
    ALTER TABLE "premiums" ADD CONSTRAINT "premiums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
