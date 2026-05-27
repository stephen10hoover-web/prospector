-- Pipeline stage column for CRM kanban
alter table businesses
  add column if not exists pipeline_stage text not null default 'new_lead';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_pipeline_stage_check'
  ) then
    alter table businesses add constraint businesses_pipeline_stage_check
      check (pipeline_stage in (
        'new_lead', 'contacted', 'follow_up', 'replied',
        'discovery_call', 'proposal_sent', 'negotiation',
        'closed_won', 'closed_lost'
      ));
  end if;
end $$;

create index if not exists businesses_pipeline_idx on businesses(user_id, pipeline_stage);
