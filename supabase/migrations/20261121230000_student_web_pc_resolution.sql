-- Student Web: unify physical classroom seat, approved web PC requests and preferred PC.
-- Safe read-only RPC replacements. No student records or assignments are modified.
create or replace function public.qlpm_student_web_whoami(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_identity jsonb;
  v_credential public.qlpm_student_web_credentials%rowtype;
  v_class_code text;
  v_assigned text;
  v_approved text;
  v_requested text;
  v_display text;
  v_status text;
begin
  v_identity:=public.qlpm_student_desktop_whoami(p_session_token);
  if v_identity is null then return null; end if;

  select * into v_credential from public.qlpm_student_web_credentials
    where student_id=(v_identity->>'student_id')::uuid;
  if v_credential.registration_id is null then return null; end if;
  select c.registration_code into v_class_code from public.classes c
    where c.id=v_credential.class_id and c.school_id=v_credential.school_id
      and c.archived_at is null;
  if v_class_code is null then return null; end if;

  -- Canonical seat: teacher's active assignment in the same school.
  select pc.computer_code into v_assigned
    from public.computer_assignments a
    join public.computers pc on pc.id=a.computer_id and pc.school_id=a.school_id
    where a.student_id=v_credential.student_id
      and a.school_id=v_credential.school_id
      and a.active=true and a.released_at is null
    order by a.assigned_date desc nulls last,a.created_at desc limit 1;
  select pc.computer_code into v_approved
    from public.qlpm_student_desktop_pc_requests req
    join public.computers pc on pc.id=req.computer_id and pc.school_id=req.school_id
    where req.student_id=v_credential.student_id
      and req.school_id=v_credential.school_id and req.status='approved'
    order by req.reviewed_at desc nulls last,req.created_at desc limit 1;
  select coalesce(nullif(trim(r.computer_code),''),nullif(trim(pending.computer_code),''))
    into v_requested
    from public.student_registrations r
    left join lateral (
       select pc.computer_code
       from public.qlpm_student_desktop_pc_requests req
       join public.computers pc on pc.id=req.computer_id and pc.school_id=req.school_id
       where req.student_id=v_credential.student_id and req.school_id=v_credential.school_id
         and req.status='pending'
       order by req.created_at desc limit 1
    ) pending on true
    where r.id=v_credential.registration_id;

  v_display:=coalesce(v_assigned,v_approved);
  v_status:=case when v_assigned is not null then 'assigned'
                  when v_approved is not null then 'approved'
                  when v_requested is not null then 'requested'
                  else 'unlinked' end;

  return v_identity || jsonb_build_object(
     'class_code',v_class_code,'username',v_credential.username,
     'pc',v_display,'pc_assigned',v_assigned,'pc_approved',v_approved,
     'pc_requested',v_requested,'pc_status',v_status
  );
end $$;
revoke all on function public.qlpm_student_web_whoami(text) from PUBLIC,anon,authenticated;
grant execute on function public.qlpm_student_web_whoami(text) to anon,authenticated;

-- Teacher dashboard diagnostics, school isolated, never returns PIN/hash/session.
create or replace function public.qlpm_teacher_student_web_devices(p_school_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.can_access_school(p_school_id) then
    raise exception 'Không có quyền truy cập dữ liệu học sinh của trường này.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'student_id',v.student_id,'username',v.username,'student_name',coalesce(st.full_name,r.full_name),
      'class_name',coalesce(st.class_name,cl.class_name),'registration_status',r.status,
      'requested_pc',coalesce(nullif(trim(r.computer_code),''),req_pending.pc),
      'approved_pc',req_approved.pc,'assigned_pc',assignment.pc,
      'display_pc',coalesce(assignment.pc,req_approved.pc),
      'pc_status',case when assignment.pc is not null then 'assigned'
                   when req_approved.pc is not null then 'approved'
                   when nullif(trim(r.computer_code),'') is not null or req_pending.pc is not null then 'requested'
                   else 'unlinked' end
    ) order by cl.class_name,coalesce(st.full_name,r.full_name))
    from public.qlpm_student_web_credentials v
    join public.student_registrations r on r.id=v.registration_id
    join public.classes cl on cl.id=v.class_id and cl.school_id=v.school_id
    left join public.students st on st.id=v.student_id and st.school_id=v.school_id
    left join lateral (
      select pc.computer_code as pc from public.computer_assignments a
      join public.computers pc on pc.id=a.computer_id and pc.school_id=a.school_id
      where a.student_id=v.student_id and a.school_id=v.school_id
      and a.active=true and a.released_at is null
      order by a.assigned_date desc nulls last,a.created_at desc limit 1
    ) assignment on true
    left join lateral (
      select pc.computer_code as pc from public.qlpm_student_desktop_pc_requests req
      join public.computers pc on pc.id=req.computer_id and pc.school_id=req.school_id
      where req.student_id=v.student_id and req.school_id=v.school_id
      and req.status='approved' order by req.reviewed_at desc nulls last,req.created_at desc limit 1
    ) req_approved on true
    left join lateral (
      select pc.computer_code as pc from public.qlpm_student_desktop_pc_requests req
      join public.computers pc on pc.id=req.computer_id and pc.school_id=req.school_id
      where req.student_id=v.student_id and req.school_id=v.school_id
      and req.status='pending' order by req.created_at desc limit 1
    ) req_pending on true
    where v.school_id=p_school_id
  ),'[]'::jsonb);
end $$;
revoke all on function public.qlpm_teacher_student_web_devices(uuid) from PUBLIC,anon;
grant execute on function public.qlpm_teacher_student_web_devices(uuid) to authenticated;
