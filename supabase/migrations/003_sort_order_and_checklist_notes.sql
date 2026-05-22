-- ============================================================
-- Migration 003: Drag-reorder for trip items + notes for checklists
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add sort_order to trip_items so users can drag-to-reorder
alter table trip_items add column if not exists sort_order integer default 0 not null;

-- 2. Add notes to checklists for per-trip notes
alter table checklists add column if not exists notes text;
