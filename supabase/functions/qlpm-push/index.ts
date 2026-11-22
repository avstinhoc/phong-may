// Older clients may still call this retired endpoint.
Deno.serve(() => new Response(JSON.stringify({error:"QLPM chỉ hiển thị thông báo trong web."}), {status:410, headers:{"Content-Type":"application/json"}}));
