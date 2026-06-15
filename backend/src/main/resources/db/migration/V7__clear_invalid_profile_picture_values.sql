-- V7: Clear profile picture values accidentally stored as PostgreSQL large-object IDs.

UPDATE utilisateurs
SET profile_picture_url = NULL
WHERE profile_picture_url IS NOT NULL
  AND profile_picture_url NOT LIKE 'data:image/%';
