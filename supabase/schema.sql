-- =====================================================================
-- SEM FRESCURA — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Configurações da loja (linha única)
-- ---------------------------------------------------------------------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Sem Frescura',
  logo_url text,
  phone text not null default '',          -- WhatsApp da lanchonete (o admin define)
  address text not null default '',
  map_url text not null default '',         -- link do Google Maps
  opening_hours text not null default '',
  pix_enabled boolean not null default true
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Carrossel, produtos e avaliações
-- ---------------------------------------------------------------------
create table if not exists carousel_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  category text not null check (category in ('lanches','porcoes','bebidas','mousses')),
  image_url text,
  available boolean not null default true,
  featured boolean not null default false,   -- destaque da home (somente lanches, máx. 3)
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_name text not null,
  customer_phone text not null,
  mode text not null check (mode in ('entrega','retirada')),
  address text,
  notes text,
  items jsonb not null,
  total numeric(10,2) not null,
  payment_method text not null check (payment_method in ('dinheiro','cartao','pix')),
  payment_status text not null default 'pendente' check (payment_status in ('pendente','aprovado')),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao','aguardando_pagamento','preparando','finalizado','cancelado')),
  mp_payment_id text,
  pix_qr_code text,
  pix_qr_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table settings        enable row level security;
alter table admin_users     enable row level security;
alter table carousel_images enable row level security;
alter table products        enable row level security;
alter table reviews         enable row level security;
alter table orders          enable row level security;

-- leitura pública
create policy "settings_read"  on settings        for select using (true);
create policy "carousel_read"  on carousel_images for select using (true);
create policy "products_read"  on products        for select using (true);
create policy "reviews_read"   on reviews         for select using (visible or is_admin());

-- escrita somente admin
create policy "settings_admin"  on settings        for update using (is_admin()) with check (is_admin());
create policy "carousel_admin"  on carousel_images for all    using (is_admin()) with check (is_admin());
create policy "products_admin"  on products        for all    using (is_admin()) with check (is_admin());
create policy "reviews_admin"   on reviews         for all    using (is_admin()) with check (is_admin());

-- pedidos: somente admin lê/atualiza. Clientes criam e consultam via RPC abaixo.
create policy "orders_admin_read"   on orders for select using (is_admin());
create policy "orders_admin_update" on orders for update using (is_admin()) with check (is_admin());

-- cada usuário enxerga apenas a própria linha em admin_users
create policy "admin_users_self" on admin_users for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RPC: criar pedido (preço sempre calculado no servidor)
-- ---------------------------------------------------------------------
create or replace function create_order(
  p_name text,
  p_phone text,
  p_mode text,
  p_address text,
  p_notes text,
  p_payment text,
  p_items jsonb
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  prod products%rowtype;
  qty int;
  lines jsonb := '[]'::jsonb;
  tot numeric(10,2) := 0;
  oid uuid;
  onum bigint;
  st text;
  pix_ok boolean;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Informe nome e telefone';
  end if;
  if p_mode not in ('entrega','retirada') then
    raise exception 'Modalidade inválida';
  end if;
  if p_mode = 'entrega' and coalesce(trim(p_address), '') = '' then
    raise exception 'Informe o endereço de entrega';
  end if;
  if p_payment not in ('dinheiro','cartao','pix') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if p_payment = 'pix' then
    select pix_enabled into pix_ok from settings where id = 1;
    if not coalesce(pix_ok, false) then raise exception 'Pix indisponível no momento'; end if;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Seu pedido está vazio';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it->>'qty')::int;
    if qty is null or qty < 1 or qty > 50 then
      raise exception 'Quantidade inválida';
    end if;
    select * into prod from products where id = (it->>'product_id')::uuid;
    if not found then raise exception 'Produto não encontrado'; end if;
    if not prod.available then raise exception '% está indisponível no momento', prod.name; end if;
    lines := lines || jsonb_build_object('product_id', prod.id, 'name', prod.name, 'price', prod.price, 'qty', qty);
    tot := tot + prod.price * qty;
  end loop;

  st := case when p_payment = 'pix' then 'aguardando_pagamento' else 'aguardando_confirmacao' end;

  insert into orders (customer_name, customer_phone, mode, address, notes, items, total, payment_method, status)
  values (
    trim(p_name), trim(p_phone), p_mode,
    case when p_mode = 'entrega' then trim(p_address) else null end,
    nullif(trim(coalesce(p_notes, '')), ''),
    lines, tot, p_payment, st
  )
  returning id, number into oid, onum;

  return json_build_object('id', oid, 'number', onum, 'total', tot);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: consultar um pedido pelo id (o UUID funciona como "chave" do cliente)
-- ---------------------------------------------------------------------
create or replace function get_order_status(p_id uuid)
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'id', id,
    'number', number,
    'status', status,
    'payment_status', payment_status,
    'payment_method', payment_method,
    'mode', mode,
    'total', total,
    'customer_name', customer_name,
    'items', items,
    'created_at', created_at,
    'pix_qr_code', case when payment_status = 'pendente' and status <> 'cancelado' then pix_qr_code end,
    'pix_qr_base64', case when payment_status = 'pendente' and status <> 'cancelado' then pix_qr_base64 end
  )
  from orders where id = p_id;
$$;

revoke all on function create_order(text,text,text,text,text,text,jsonb) from public;
revoke all on function get_order_status(uuid) from public;
grant execute on function create_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function get_order_status(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage (imagens) — bucket público, escrita só do admin
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_read"   on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
create policy "media_update" on storage.objects for update using (bucket_id = 'media' and is_admin());
create policy "media_delete" on storage.objects for delete using (bucket_id = 'media' and is_admin());

-- ---------------------------------------------------------------------
-- Realtime: novos pedidos aparecem no painel sem recarregar
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table orders;

-- =====================================================================
-- PRIMEIRO ADMIN
-- 1) Authentication > Users > Add user (e-mail + senha)
-- 2) Rode (trocando o e-mail):
--    insert into admin_users (user_id)
--    select id from auth.users where email = 'seu@email.com';
-- =====================================================================

-- liga a avaliação ao pedido (1 avaliação por pedido)
alter table reviews
  add column if not exists order_id uuid unique references orders (id) on delete set null;

-- cliente envia a avaliação (só se o pedido estiver finalizado)
create or replace function submit_review(p_order_id uuid, p_rating int, p_comment text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where id = p_order_id;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if o.status <> 'finalizado' then
    raise exception 'Você só pode avaliar depois que o pedido for finalizado';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Nota inválida';
  end if;
  if exists (select 1 from reviews where order_id = p_order_id) then
    raise exception 'Este pedido já foi avaliado';
  end if;

  insert into reviews (author, rating, comment, visible, order_id)
  values (
    split_part(trim(o.customer_name), ' ', 1),   -- só o primeiro nome aparece no site
    p_rating,
    left(trim(coalesce(p_comment, '')), 500),
    true,
    p_order_id
  );
  return json_build_object('ok', true);
end;
$$;

revoke all on function submit_review(uuid, int, text) from public;
grant execute on function submit_review(uuid, int, text) to anon, authenticated;

-- get_order_status agora informa se o pedido já foi avaliado
create or replace function get_order_status(p_id uuid)
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'id', id,
    'number', number,
    'status', status,
    'payment_status', payment_status,
    'payment_method', payment_method,
    'mode', mode,
    'total', total,
    'customer_name', customer_name,
    'items', items,
    'created_at', created_at,
    'pix_qr_code', case when payment_status = 'pendente' and status <> 'cancelado' then pix_qr_code end,
    'pix_qr_base64', case when payment_status = 'pendente' and status <> 'cancelado' then pix_qr_base64 end,
    'reviewed', exists (select 1 from reviews r where r.order_id = orders.id),
    'review_rating', (select r.rating from reviews r where r.order_id = orders.id)
  )
  from orders where id = p_id;
$$;