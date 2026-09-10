-- =============================================================
-- SCHEMA — VM VENDAS E COMPRAS
-- Parte 1 de 3: Tabelas, tipos, funções e gatilhos
-- =============================================================

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================
-- TIPOS PERSONALIZADOS (ENUMS)
-- =============================================================
do $$ begin
  create type user_role as enum ('admin','cliente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_condition as enum ('novo','usado','seminovo','outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum
    ('disponivel','indisponivel','em_negociacao','vendido','oculto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum
    ('aguardando','recebido','em_analise','confirmado',
     'em_preparacao','enviado','concluido','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_status as enum
    ('enviada','em_analise','contraproposta','aceita',
     'recusada','cancelada','concluida');
exception when duplicate_object then null; end $$;

-- =============================================================
-- FUNÇÃO UTILITÁRIA: atualiza o campo updated_at
-- =============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- =============================================================
-- TABELA: PROFILES
-- =============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  telefone    text,
  whatsapp    text,
  role        user_role not null default 'cliente',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =============================================================
-- FUNÇÃO: is_admin() — agora DEPOIS de profiles existir
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Cria profile automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, telefone, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'whatsapp'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- TABELA: CATEGORIES
-- =============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,
  descricao   text,
  imagem_url  text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_ativo_idx on public.categories(ativo);
create index if not exists categories_ordem_idx on public.categories(ordem);

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated
  before update on public.categories
  for each row execute function public.set_updated_at();

-- =============================================================
-- TABELA: PRODUCTS
-- =============================================================
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  slug              text unique,
  descricao         text,
  descricao_curta   text,
  preco             numeric(12,2) not null default 0 check (preco >= 0),
  preco_promocional numeric(12,2) check (preco_promocional is null or preco_promocional >= 0),
  categoria_id      uuid references public.categories(id) on delete set null,
  marca             text,
  modelo            text,
  sku               text unique,
  condicao          product_condition not null default 'novo',
  estoque           int not null default 0 check (estoque >= 0),
  status            product_status not null default 'disponivel',
  destaque          boolean not null default false,
  peso              numeric(10,3),
  largura           numeric(10,2),
  altura            numeric(10,2),
  profundidade      numeric(10,2),
  especificacoes    jsonb not null default '{}'::jsonb,
  caracteristicas   jsonb not null default '[]'::jsonb,
  visualizacoes     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_categoria_idx on public.products(categoria_id);
create index if not exists products_status_idx    on public.products(status);
create index if not exists products_destaque_idx  on public.products(destaque);
create index if not exists products_created_idx   on public.products(created_at desc);
create index if not exists products_preco_idx     on public.products(preco);

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

-- =============================================================
-- TABELA: PRODUCT IMAGES
-- =============================================================
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  url          text not null,
  storage_path text,
  alt          text,
  ordem        int not null default 0,
  principal    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images(product_id);

create unique index if not exists product_images_one_main_idx
  on public.product_images(product_id) where principal = true;

-- =============================================================
-- TABELA: ORDERS
-- =============================================================
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  numero          text unique,
  user_id         uuid not null references public.profiles(id) on delete restrict,
  status          order_status not null default 'aguardando',
  subtotal        numeric(12,2) not null default 0,
  desconto        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  observacoes     text,
  obs_admin       text,
  nome_contato    text,
  telefone        text,
  whatsapp        text,
  email_contato   text,
  endereco        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_user_idx    on public.orders(user_id);
create index if not exists orders_status_idx  on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

create sequence if not exists public.orders_numero_seq;

create or replace function public.gen_order_numero()
returns trigger language plpgsql as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'PED-' || to_char(now(),'YYYY') || '-' ||
                  lpad(nextval('public.orders_numero_seq')::text, 5, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_orders_numero on public.orders;
create trigger trg_orders_numero
  before insert on public.orders
  for each row execute function public.gen_order_numero();

-- =============================================================
-- TABELA: ORDER ITEMS
-- =============================================================
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_nome    text not null,
  product_sku     text,
  product_imagem  text,
  preco_unitario  numeric(12,2) not null,
  quantidade      int not null check (quantidade > 0),
  subtotal        numeric(12,2) not null,
  created_at      timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- =============================================================
-- TABELA: PROPOSALS
-- =============================================================
create table if not exists public.proposals (
  id              uuid primary key default gen_random_uuid(),
  numero          text unique,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  preco_anunciado numeric(12,2) not null,
  valor_proposta  numeric(12,2) not null check (valor_proposta >= 0),
  quantidade      int not null default 1 check (quantidade > 0),
  mensagem        text,
  status          proposal_status not null default 'enviada',
  resposta_loja   text,
  valor_contra    numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists proposals_user_idx    on public.proposals(user_id);
create index if not exists proposals_product_idx on public.proposals(product_id);
create index if not exists proposals_status_idx  on public.proposals(status);

drop trigger if exists trg_proposals_updated on public.proposals;
create trigger trg_proposals_updated
  before update on public.proposals
  for each row execute function public.set_updated_at();

create sequence if not exists public.proposals_numero_seq;

create or replace function public.gen_proposal_numero()
returns trigger language plpgsql as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'PROP-' || to_char(now(),'YYYY') || '-' ||
                  lpad(nextval('public.proposals_numero_seq')::text, 5, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_proposals_numero on public.proposals;
create trigger trg_proposals_numero
  before insert on public.proposals
  for each row execute function public.gen_proposal_numero();

-- =============================================================
-- TABELA: PROPOSAL IMAGES
-- =============================================================
create table if not exists public.proposal_images (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  url          text not null,
  storage_path text,
  created_at   timestamptz not null default now()
);

create index if not exists proposal_images_proposal_idx on public.proposal_images(proposal_id);

-- =============================================================
-- TABELA: CHATS
-- =============================================================
create table if not exists public.chats (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  proposal_id       uuid references public.proposals(id) on delete set null,
  order_id          uuid references public.orders(id) on delete set null,
  assunto           text,
  ultima_msg        text,
  ultima_msg_at     timestamptz,
  nao_lidas_admin   int not null default 0,
  nao_lidas_cliente int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists chats_user_idx    on public.chats(user_id);
create index if not exists chats_updated_idx on public.chats(updated_at desc);

drop trigger if exists trg_chats_updated on public.chats;
create trigger trg_chats_updated
  before update on public.chats
  for each row execute function public.set_updated_at();

-- =============================================================
-- TABELA: CHAT MESSAGES
-- =============================================================
create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  chat_id      uuid not null references public.chats(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  sender_role  user_role not null,
  conteudo     text,
  imagem_url   text,
  storage_path text,
  lida         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_chat_idx on public.chat_messages(chat_id, created_at);

create or replace function public.on_new_chat_message()
returns trigger language plpgsql as $$
begin
  update public.chats
     set ultima_msg         = coalesce(left(new.conteudo, 120), '[imagem]'),
         ultima_msg_at      = new.created_at,
         nao_lidas_admin    = case when new.sender_role = 'cliente'
                                   then nao_lidas_admin + 1
                                   else nao_lidas_admin end,
         nao_lidas_cliente  = case when new.sender_role = 'admin'
                                   then nao_lidas_cliente + 1
                                   else nao_lidas_cliente end,
         updated_at = now()
   where id = new.chat_id;
  return new;
end; $$;

drop trigger if exists trg_chat_message_notify on public.chat_messages;
create trigger trg_chat_message_notify
  after insert on public.chat_messages
  for each row execute function public.on_new_chat_message();

-- =============================================================
-- TABELA: FAVORITES
-- =============================================================
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists favorites_user_idx on public.favorites(user_id);

-- =============================================================
-- TABELA: NOTIFICATIONS
-- =============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tipo       text not null,
  titulo     text not null,
  mensagem   text,
  link       text,
  lida       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, lida, created_at desc);

-- =============================================================
-- TABELAS DE CONFIGURAÇÃO (linha única — id = 1)
-- =============================================================
create table if not exists public.company_settings (
  id               int primary key default 1 check (id = 1),
  nome_empresa     text,
  nome_fantasia    text,
  cnpj             text,
  telefone         text,
  whatsapp         text,
  email            text,
  endereco         text,
  cidade           text,
  estado           text,
  cep              text,
  descricao        text,
  horario          text,
  updated_at       timestamptz not null default now()
);

create table if not exists public.store_settings (
  id                   int primary key default 1 check (id = 1),
  banner_home_url      text,
  banners_secundarios  jsonb not null default '[]'::jsonb,
  titulo_home          text,
  subtitulo_home       text,
  whatsapp_msg_produto text default 'Olá! Tenho interesse no produto [NOME DO PRODUTO]. Gostaria de mais informações.',
  whatsapp_msg_geral   text default 'Olá! Vim pela loja online e gostaria de mais informações.',
  politica_privacidade text,
  termos_uso           text,
  updated_at           timestamptz not null default now()
);

create table if not exists public.visual_settings (
  id                int primary key default 1 check (id = 1),
  logo_url          text,
  logo_compacta_url text,
  favicon_url       text,
  cor_principal     text default '#0ea5e9',
  cor_secundaria    text default '#0f172a',
  cor_destaque      text default '#f59e0b',
  cor_fundo         text default '#ffffff',
  cor_texto         text default '#0f172a',
  cor_sucesso       text default '#16a34a',
  cor_alerta        text default '#f59e0b',
  cor_erro          text default '#dc2626',
  fonte             text default 'Inter',
  raio_card         text default '12px',
  raio_botao        text default '8px',
  tamanho_botao     text default 'md',
  densidade         text default 'comfortable',
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_company_updated on public.company_settings;
create trigger trg_company_updated before update on public.company_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_store_updated on public.store_settings;
create trigger trg_store_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_visual_updated on public.visual_settings;
create trigger trg_visual_updated before update on public.visual_settings
  for each row execute function public.set_updated_at();

insert into public.company_settings (id) values (1) on conflict do nothing;
insert into public.store_settings   (id) values (1) on conflict do nothing;
insert into public.visual_settings  (id) values (1) on conflict do nothing;

-- Fim da Parte 1
