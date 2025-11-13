-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "substitution" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "transcriptions_user_id_idx" ON "transcriptions"("user_id");

-- CreateIndex
CREATE INDEX "transcriptions_created_at_idx" ON "transcriptions"("created_at");

-- CreateIndex
CREATE INDEX "dictionary_user_id_idx" ON "dictionary"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_user_id_word_key" ON "dictionary"("user_id", "word");

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary" ADD CONSTRAINT "dictionary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
