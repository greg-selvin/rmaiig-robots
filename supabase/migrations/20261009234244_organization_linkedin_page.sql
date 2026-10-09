alter table public.vendors add column linkedin_url text;

create function public.save_organization(p_workspace_id uuid,p_organization_id uuid,p_name text,p_normalized_name text,p_website_url text,p_description text,p_organization_type text,p_roles text[],p_linkedin_url text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_organization_id uuid;
begin
  v_organization_id := public.save_organization(p_workspace_id,p_organization_id,p_name,p_normalized_name,p_website_url,p_description,p_organization_type,p_roles);
  update public.vendors set linkedin_url=nullif(trim(p_linkedin_url),'') where id=v_organization_id and workspace_id=p_workspace_id;
  return v_organization_id;
end $$;

revoke all on function public.save_organization(uuid,uuid,text,text,text,text,text,text[],text) from public,anon;
grant execute on function public.save_organization(uuid,uuid,text,text,text,text,text,text[],text) to authenticated;
