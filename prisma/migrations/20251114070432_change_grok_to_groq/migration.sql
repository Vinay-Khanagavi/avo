-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ai_formatter_provider" TEXT,
    "groq_api_key" TEXT,
    "openai_api_key" TEXT,
    "ollama_url" TEXT,
    "detect_bullet_points" BOOLEAN NOT NULL DEFAULT true,
    "refine_grammar" BOOLEAN NOT NULL DEFAULT true,
    "improve_punctuation" BOOLEAN NOT NULL DEFAULT true,
    "improve_capitalization" BOOLEAN NOT NULL DEFAULT true,
    "add_formatting" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_settings_user_id_idx" ON "user_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
