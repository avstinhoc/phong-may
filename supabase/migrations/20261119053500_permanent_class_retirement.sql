alter table public.classes add column retired_at timestamptz,
  add constraint retired_class_stays_archived check (retired_at is null or archived_at is not null);

create function public.ic3_retire_class(p_class_id uuid,p_confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare c public.classes;
begin
  -- Reuse existing ownership, school access, row lock and exact-name confirmation.
  c := public.ic3_manage_class_registration(p_class_id,'archive',p_confirmation,null);
  update public.classes set retired_at=coalesce(retired_at,now()) where id=c.id;
  delete from public.school_sheet_tabs t using public.school_sheet_links l
    where t.link_id=l.id and l.school_id=c.school_id and t.class_name=c.class_name
      and not exists(select from public.classes k where k.school_id=c.school_id
        and k.class_name=c.class_name and k.archived_at is null);
end;
$$;
revoke all on function public.ic3_retire_class(uuid,text) from public,anon;
grant execute on function public.ic3_retire_class(uuid,text) to authenticated;
