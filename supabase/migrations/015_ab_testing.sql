-- A/B testing: each sequence step can optionally have a variant B subject/body.
-- If subject_b / body_b are NULL, no A/B test is active for that step.
alter table sequence_steps
  add column if not exists subject_b text,
  add column if not exists body_b text;

-- Track which variant each enrollment is assigned
alter table sequence_enrollments
  add column if not exists ab_variant text default 'A' check (ab_variant in ('A', 'B'));

-- Aggregate A/B results per step variant
create table if not exists sequence_ab_results (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade not null,
  step_number int not null,
  variant text not null check (variant in ('A', 'B')),
  enrollment_id uuid references sequence_enrollments(id) on delete set null,
  sent_at timestamptz not null default now(),
  opened boolean not null default false,
  replied boolean not null default false
);

create index if not exists ab_results_sequence_idx on sequence_ab_results(sequence_id, step_number, variant);
create index if not exists ab_results_enrollment_idx on sequence_ab_results(enrollment_id);

alter table sequence_ab_results enable row level security;

create policy "Users can view their own A/B results"
  on sequence_ab_results for select
  using (
    exists (select 1 from sequences where id = sequence_id and user_id = auth.uid())
  );
