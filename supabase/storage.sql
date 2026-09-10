-- =============================================================
-- STORAGE — VM VENDAS E COMPRAS
-- Parte 3 de 3: Buckets e políticas de arquivos
-- =============================================================

-- =============================================================
-- 1. CRIAR OS BUCKETS
-- =============================================================
insert into storage.buckets (id, name, public)
values
  ('products',  'products',  true),
  ('branding',  'branding',  true),
  ('proposals', 'proposals', false),
  ('chat',      'chat',      false)
on conflict (id) do nothing;

-- =============================================================
-- 2. POLÍTICAS DO BUCKET "products"
-- =============================================================
drop policy if exists "products_public_read_storage" on storage.objects;
create policy "products_public_read_storage" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "products_admin_insert_storage" on storage.objects;
create policy "products_admin_insert_storage" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "products_admin_update_storage" on storage.objects;
create policy "products_admin_update_storage" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());

drop policy if exists "products_admin_delete_storage" on storage.objects;
create policy "products_admin_delete_storage" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

-- =============================================================
-- 3. POLÍTICAS DO BUCKET "branding"
-- =============================================================
drop policy if exists "branding_public_read_storage" on storage.objects;
create policy "branding_public_read_storage" on storage.objects
  for select using (bucket_id = 'branding');

drop policy if exists "branding_admin_write_storage" on storage.objects;
create policy "branding_admin_write_storage" on storage.objects
  for all using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

-- =============================================================
-- 4. POLÍTICAS DO BUCKET "proposals"
-- =============================================================
drop policy if exists "proposals_select_storage" on storage.objects;
create policy "proposals_select_storage" on storage.objects
  for select using (
    bucket_id = 'proposals' and (
      public.is_admin()
      or exists (
        select 1 from public.proposals p
        where p.id::text = split_part(name,'/',1)
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "proposals_insert_storage" on storage.objects;
create policy "proposals_insert_storage" on storage.objects
  for insert with check (
    bucket_id = 'proposals' and (
      public.is_admin()
      or exists (
        select 1 from public.proposals p
        where p.id::text = split_part(name,'/',1)
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "proposals_delete_storage" on storage.objects;
create policy "proposals_delete_storage" on storage.objects
  for delete using (
    bucket_id = 'proposals' and (
      public.is_admin()
      or exists (
        select 1 from public.proposals p
        where p.id::text = split_part(name,'/',1)
          and p.user_id = auth.uid()
      )
    )
  );

-- =============================================================
-- 5. POLÍTICAS DO BUCKET "chat"
-- =============================================================
drop policy if exists "chat_select_storage" on storage.objects;
create policy "chat_select_storage" on storage.objects
  for select using (
    bucket_id = 'chat' and (
      public.is_admin()
      or exists (
        select 1 from public.chats c
        where c.id::text = split_part(name,'/',1)
          and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists "chat_insert_storage" on storage.objects;
create policy "chat_insert_storage" on storage.objects
  for insert with check (
    bucket_id = 'chat' and (
      public.is_admin()
      or exists (
        select 1 from public.chats c
        where c.id::text = split_part(name,'/',1)
          and c.user_id = auth.uid()
      )
    )
  );

-- Fim da Parte 3