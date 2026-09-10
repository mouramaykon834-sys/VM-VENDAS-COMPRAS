-- =============================================================
-- POLÍTICAS DE SEGURANÇA (RLS) — VM VENDAS E COMPRAS
-- Parte 2 de 3: Row Level Security
-- =============================================================

-- =============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================================
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.proposals         enable row level security;
alter table public.proposal_images   enable row level security;
alter table public.chats             enable row level security;
alter table public.chat_messages     enable row level security;
alter table public.favorites         enable row level security;
alter table public.notifications     enable row level security;
alter table public.company_settings  enable row level security;
alter table public.store_settings    enable row level security;
alter table public.visual_settings   enable row level security;

-- =============================================================
-- PROFILES
-- =============================================================
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- CATEGORIES — público lê as ativas; admin gerencia
-- =============================================================
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (ativo = true or public.is_admin());

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- PRODUCTS — público lê os não ocultos; admin tudo
-- =============================================================
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (status <> 'oculto' or public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- PRODUCT IMAGES — segue o produto
-- =============================================================
drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status <> 'oculto' or public.is_admin())
    )
  );

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- ORDERS
-- =============================================================
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete using (public.is_admin());

-- =============================================================
-- ORDER ITEMS
-- =============================================================
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o
            where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- PROPOSALS
-- =============================================================
drop policy if exists "proposals_select_own_or_admin" on public.proposals;
create policy "proposals_select_own_or_admin" on public.proposals
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "proposals_insert_own" on public.proposals;
create policy "proposals_insert_own" on public.proposals
  for insert with check (auth.uid() = user_id);

drop policy if exists "proposals_update_own_limited" on public.proposals;
create policy "proposals_update_own_limited" on public.proposals
  for update using (auth.uid() = user_id and status = 'enviada')
  with check (auth.uid() = user_id and status in ('enviada','cancelada'));

drop policy if exists "proposals_admin_all" on public.proposals;
create policy "proposals_admin_all" on public.proposals
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- PROPOSAL IMAGES
-- =============================================================
drop policy if exists "proposal_images_select_own_or_admin" on public.proposal_images;
create policy "proposal_images_select_own_or_admin" on public.proposal_images
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "proposal_images_insert_own" on public.proposal_images;
create policy "proposal_images_insert_own" on public.proposal_images
  for insert with check (
    exists (select 1 from public.proposals p
            where p.id = proposal_id and p.user_id = auth.uid())
  );

drop policy if exists "proposal_images_admin_write" on public.proposal_images;
create policy "proposal_images_admin_write" on public.proposal_images
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- CHATS
-- =============================================================
drop policy if exists "chats_select_own_or_admin" on public.chats;
create policy "chats_select_own_or_admin" on public.chats
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own" on public.chats
  for insert with check (auth.uid() = user_id);

drop policy if exists "chats_update_own_or_admin" on public.chats;
create policy "chats_update_own_or_admin" on public.chats
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- =============================================================
-- CHAT MESSAGES
-- =============================================================
drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "chat_messages_insert_participant" on public.chat_messages;
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.user_id = auth.uid() or public.is_admin())
    )
  );

-- =============================================================
-- FAVORITES
-- =============================================================
drop policy if exists "favorites_all_own" on public.favorites;
create policy "favorites_all_own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_insert_auth" on public.notifications;
create policy "notifications_insert_auth" on public.notifications
  for insert with check (auth.role() = 'authenticated');

-- =============================================================
-- CONFIGURAÇÕES — leitura pública, escrita só admin
-- =============================================================
drop policy if exists "company_read_all" on public.company_settings;
create policy "company_read_all" on public.company_settings
  for select using (true);

drop policy if exists "company_write_admin" on public.company_settings;
create policy "company_write_admin" on public.company_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "store_read_all" on public.store_settings;
create policy "store_read_all" on public.store_settings
  for select using (true);

drop policy if exists "store_write_admin" on public.store_settings;
create policy "store_write_admin" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "visual_read_all" on public.visual_settings;
create policy "visual_read_all" on public.visual_settings
  for select using (true);

drop policy if exists "visual_write_admin" on public.visual_settings;
create policy "visual_write_admin" on public.visual_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Fim da Parte 2
