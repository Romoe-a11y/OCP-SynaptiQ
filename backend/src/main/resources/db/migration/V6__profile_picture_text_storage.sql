-- V6: Profile pictures are stored as data URLs, so VARCHAR is too small.

ALTER TABLE utilisateurs
    ALTER COLUMN profile_picture_url TYPE TEXT;
