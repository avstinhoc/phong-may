-- Remove false positive: Vietnamese real-name tokens "Hoàng Tú" must not be confused with "hoàng tử".
CREATE OR REPLACE FUNCTION public.ic3_name_review(p_name text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=''
AS $function$
DECLARE raw_name text:=trim(regexp_replace(coalesce(p_name,''),'\s+',' ','g'));
 normalized text;
 parts text[];
 words int;
 message text;
BEGIN
 normalized:=lower(regexp_replace(
   extensions.unaccent(replace(replace(raw_name,'Đ','D'),'đ','d')),
   '[^A-Za-z0-9 ]',' ','g'));
 normalized:=trim(regexp_replace(normalized,'\s+',' ','g'));
 parts:=regexp_split_to_array(raw_name,'\s+'); words:=coalesce(array_length(parts,1),0);
 IF length(raw_name) NOT BETWEEN 5 AND 90 OR words<2 OR raw_name !~ '^[[:alpha:] ]+$' THEN
   RETURN jsonb_build_object('decision','reject','reason','Tên phải là họ tên thật gồm ít nhất 2 từ, chỉ chứa chữ cái, không dùng ký tự đặc biệt hoặc số.');
 END IF;
 IF words>7 OR length(raw_name)>65 THEN
   RETURN jsonb_build_object('decision','reject','reason','Tên đăng ký quá dài hoặc chứa nhiều cụm từ không phải họ tên. Hãy nhập đúng tên trong danh sách lớp.');
 END IF;
 -- Clear fantasy names, flattery, trolling, claims of status, roleplay and gaming tags.
 IF normalized ~ '(^| )(ba khi|khong thich|khong biet|dep trai|dep gai|soai ca|hot boy|hot girl|sieu cap|sieu nhan|than dong|than thanh|than tai|than bai|vo dich|dai ca|dai boss|ong trum|chu tich|hoang de|cong chua|giau nhat|nguoi dep|nguoi yeu|nguoi la|tao la|ten la|khong ten|ten gi|hacker|hack game|vippro|vip pro|vip|pro max|premium|predium|prime|superman|spiderman|batman|ironman|minecraft|free fire|roblox|sigma|rizz|noob|admin|test|fake name|abc)( |$)'
 OR normalized ~ '(^| )(sieu|god|king|queen|proplayer|pro|troll|idol|anime|doraemon|nobita|naruto|luffy|kakashi|pokemon)( |$)' THEN
   RETURN jsonb_build_object('decision','reject','reason','Họ tên có cụm từ biệt danh, trò đùa hoặc danh xưng không phù hợp. Vui lòng ghi đúng họ tên thật có dấu. Nếu tên này là tên thật, báo giáo viên kiểm tra.');
 END IF;
 IF words>5 OR
    (words>=3 AND raw_name=extensions.unaccent(raw_name)) OR
    normalized ~ '(^| )(xinh|ngau|cool|cute|hay nhat|trai dep|gai xinh|khong sao|nhoc|be iu)( |$)' THEN
   RETURN jsonb_build_object('decision','review','reason','Tên có dấu hiệu cần xác minh (thiếu dấu, quá nhiều từ hoặc giống biệt danh). Giáo viên cần kiểm tra trước khi duyệt.');
 END IF;
 RETURN jsonb_build_object('decision','allow','reason','');
END;
$function$;

-- Re-evaluate ONLY existing incorrectly flagged students, preserving confirmed profiles
-- and all student IDs, computer assignments, grades and registration records.
update public.students s
set name_review_status='allow',
 name_review_reason='Tên hợp lệ sau khi cải thiện bộ kiểm tra'
where s.name_review_status in ('reject','review')
 and (public.ic3_name_review(s.full_name)->>'decision')='allow';
-- Clear obsolete pending review notices without silently approving applications.
update public.student_registrations r
set review_note=null
where r.status='pending' and r.review_note is not null
 and r.review_note like 'Tên có dấu hiệu cần xác minh%'
 and (public.ic3_name_review(r.full_name)->>'decision')='allow';
