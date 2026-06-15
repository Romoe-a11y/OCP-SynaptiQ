-- V5: Ensure notification columns exist and add profile picture URL

ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS notification_email   BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_webhook VARCHAR(512),
    ADD COLUMN IF NOT EXISTS profile_picture_url  VARCHAR(500);
