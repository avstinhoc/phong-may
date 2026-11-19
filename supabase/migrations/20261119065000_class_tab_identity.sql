create table public.class_tab_identity(
 class_id uuid primary key references public.classes(id) on delete cascade,
 school_id uuid not null references public.schools(id), link_id uuid not null references public.school_sheet_links(id) on delete cascade,
 workbook text not null,gid integer not null check(gid>=0), class_name text not null,
 state text not null default 'active' check(state in ('active','delete_requested','done')),
 missing_since timestamptz
);
alter table public.class_tab_identity enable row level security;
revoke all on public.class_tab_identity from public,anon,authenticated;
grant select,insert,update on public.class_tab_identity to service_role;

-- Adopt only an existing mapping with an unambiguous live class and matching tab label.
insert into public.class_tab_identity(class_id,school_id,link_id,workbook,gid,class_name)
select c.id,c.school_id,l.id,l.spreadsheet_id,t.sheet_gid,c.class_name
from public.school_sheet_tabs t join public.school_sheet_links l on l.id=t.link_id
join public.classes c on c.school_id=l.school_id and c.class_name=t.class_name
where c.archived_at is null and t.sheet_gid>=0 and t.sheet_title=replace(c.class_name,'/','／')
and t.sheet_title<>'Gốc' and t.sheet_title<>coalesce(l.template_tab,'Gốc')
and c.created_at<=t.created_at
and (select count(*) from public.classes other where other.school_id=c.school_id and other.class_name=c.class_name and other.archived_at is null)=1
on conflict do nothing;

create function public.queue_class_tab_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.class_tab_identity set state='delete_requested' where class_id=new.id and school_id=new.school_id and state='active';
 return new;
end $$;
revoke all on function public.queue_class_tab_delete() from public,anon,authenticated;
create trigger queue_class_tab_delete after update of retired_at on public.classes for each row
when(old.retired_at is null and new.retired_at is not null) execute function public.queue_class_tab_delete();

create function public.observe_missing_class_tab(p_class uuid,p_link uuid,p_workbook text,p_gid integer)
returns void language plpgsql security definer set search_path='' as $$
declare binding public.class_tab_identity;
begin
 select * into binding from public.class_tab_identity where class_id=p_class and link_id=p_link and workbook=p_workbook and gid=p_gid and state='active' for update;
 if not found or not exists(select from public.school_sheet_links l where l.id=p_link and l.school_id=binding.school_id and l.spreadsheet_id=p_workbook) then return; end if;
 if binding.missing_since is null then
 update public.class_tab_identity set missing_since=now() where class_id=p_class;
 elsif binding.missing_since<=now()-interval '1 minute' then
 update public.class_tab_identity set state='done' where class_id=p_class;
 update public.classes set archived_at=coalesce(archived_at,now()),retired_at=coalesce(retired_at,now()) where id=p_class and school_id=binding.school_id;
 delete from public.school_sheet_tabs where link_id=p_link and sheet_gid=p_gid and class_name=binding.class_name;
 end if;
end $$;
revoke all on function public.observe_missing_class_tab(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.observe_missing_class_tab(uuid,uuid,text,integer) to service_role;
