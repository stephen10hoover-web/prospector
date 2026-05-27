-- Fix audit_reports unique constraint to be per-user, not global
-- This prevents cross-user data overwrite via upsert
alter table audit_reports drop constraint if exists audit_reports_business_id_key;
alter table audit_reports add constraint audit_reports_business_user_key unique (business_id, user_id);
