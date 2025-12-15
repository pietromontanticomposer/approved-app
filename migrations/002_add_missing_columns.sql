-- Migration: 002_add_missing_columns.sql
-- Purpose: Add missing columns to versions table if they don't exist

-- Add media_type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_type'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_type text;
  END IF;
END$$;

-- Add media_storage_path if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_storage_path'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_storage_path text;
  END IF;
END$$;

-- Add media_url if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_url'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_url text;
  END IF;
END$$;

-- Add other missing media columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_original_name'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_original_name text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_display_name'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_display_name text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_duration'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_duration double precision;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_thumbnail_path'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_thumbnail_path text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'versions'
      AND column_name = 'media_thumbnail_url'
  ) THEN
    ALTER TABLE versions ADD COLUMN media_thumbnail_url text;
  END IF;
END$$;
