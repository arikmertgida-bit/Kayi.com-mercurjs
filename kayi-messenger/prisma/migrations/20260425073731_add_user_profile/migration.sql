-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);
