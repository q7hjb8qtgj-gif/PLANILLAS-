create extension if not exists pgcrypto;

create type public.app_role as enum ('administrador', 'validador', 'digitador', 'consulta', 'encargado_area');
create type public.payroll_status as enum ('Borrador', 'Pendiente de revisión', 'Observada', 'Corregida', 'Aprobada', 'Rechazada', 'Pagada', 'Anulada');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (name)
);
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, name)
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  role public.app_role not null,
  company_id uuid references public.companies(id),
  area_id uuid references public.areas(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique nulls not distinct (user_id, role, company_id, area_id)
);

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role = required_role and deleted_at is null) $$;
create or replace function public.can_access_scope(target_company uuid, target_area uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_role('administrador') or public.has_role('validador')
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and deleted_at is null
        and (company_id is null or company_id = target_company)
        and (area_id is null or area_id = target_area)
    )
$$;

create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  area_id uuid references public.areas(id),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, name)
);
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  area_id uuid references public.areas(id),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.work_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  area_id uuid references public.areas(id),
  cost_center_id uuid references public.cost_centers(id),
  name text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.payment_concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('Ingreso', 'Descuento')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.payroll_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  full_name text not null,
  dpi text,
  nit text,
  company_id uuid not null references public.companies(id),
  area_id uuid not null references public.areas(id),
  position_id uuid references public.positions(id),
  contract_type text,
  bank_account text,
  payment_method text not null,
  base_rate numeric(14,2) not null default 0 check (base_rate >= 0),
  active boolean not null default true,
  start_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, code)
);
create unique index employees_dpi_unique on public.employees(dpi) where dpi is not null and deleted_at is null;
create unique index employees_nit_unique on public.employees(nit) where nit is not null and deleted_at is null;
create index employees_scope_idx on public.employees(company_id, area_id) where deleted_at is null;

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  company_id uuid not null references public.companies(id),
  area_id uuid not null references public.areas(id),
  start_date date not null,
  end_date date not null,
  week smallint not null check (week between 1 and 53),
  year smallint not null,
  payroll_type_id uuid references public.payroll_types(id),
  payroll_type text not null,
  status public.payroll_status not null default 'Borrador',
  digitizer_id uuid references public.profiles(id),
  reviewer_id uuid references public.profiles(id),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date >= start_date)
);
create index payroll_periods_scope_idx on public.payroll_periods(company_id, area_id, start_date, end_date) where deleted_at is null;
create table public.payrolls (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.payroll_periods(id),
  header_total_income numeric(16,2),
  header_total_deductions numeric(16,2),
  header_net_total numeric(16,2),
  status public.payroll_status not null default 'Borrador',
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index payrolls_period_idx on public.payrolls(period_id) where deleted_at is null;
create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id),
  employee_id uuid not null references public.employees(id),
  employee_code text not null,
  company_id uuid not null references public.companies(id),
  area_id uuid not null references public.areas(id),
  position_name text,
  days_worked numeric(7,2) not null default 0,
  regular_hours numeric(9,2) not null default 0,
  overtime_hours numeric(9,2) not null default 0,
  rate numeric(14,2) not null default 0,
  regular_salary numeric(14,2) not null default 0,
  overtime_pay numeric(14,2) not null default 0,
  work_pay numeric(14,2) not null default 0,
  bonus numeric(14,2) not null default 0,
  commissions numeric(14,2) not null default 0,
  other_income numeric(14,2) not null default 0,
  igss numeric(14,2) not null default 0,
  advances numeric(14,2) not null default 0,
  loans numeric(14,2) not null default 0,
  other_deductions numeric(14,2) not null default 0,
  total_income numeric(14,2) generated always as (regular_salary + overtime_pay + work_pay + bonus + commissions + other_income) stored,
  total_deductions numeric(14,2) generated always as (igss + advances + loans + other_deductions) stored,
  net_pay numeric(14,2) generated always as ((regular_salary + overtime_pay + work_pay + bonus + commissions + other_income) - (igss + advances + loans + other_deductions)) stored,
  payment_method text not null,
  reference_number text,
  notes text,
  support_document text,
  validation_status text not null default 'Pendiente',
  source_file text,
  source_row integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index payroll_items_payroll_idx on public.payroll_items(payroll_id) where deleted_at is null;
create index payroll_items_employee_idx on public.payroll_items(employee_id) where deleted_at is null;
create index payroll_items_reference_idx on public.payroll_items(reference_number) where reference_number is not null and deleted_at is null;

create table public.cooperative_settings (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null unique references public.payrolls(id),
  enabled boolean not null default false,
  commission_rate numeric(7,4) not null default 5,
  vat_rate numeric(7,4) not null default 12,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (commission_rate >= 0 and vat_rate >= 0)
);
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id),
  started_by uuid references public.profiles(id),
  status text not null,
  rule_count integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid references public.validations(id),
  payroll_id uuid not null references public.payrolls(id),
  payroll_item_id uuid references public.payroll_items(id),
  severity text not null check (severity in ('Crítico', 'Alto', 'Medio', 'Informativo')),
  rule_name text not null,
  affected_amount numeric(14,2) not null default 0,
  description text not null,
  recommendation text,
  status text not null default 'Pendiente',
  assigned_to uuid references public.profiles(id),
  evidence text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index findings_payroll_idx on public.findings(payroll_id, severity, status) where deleted_at is null;
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id),
  step text not null,
  action text not null,
  approver_id uuid not null references public.profiles(id),
  comment text,
  exception_authorization boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index approvals_payroll_idx on public.approvals(payroll_id);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id),
  amount numeric(16,2) not null check (amount >= 0),
  payment_method text not null,
  reference_number text,
  paid_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index payments_reference_idx on public.payments(reference_number) where reference_number is not null and deleted_at is null;
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  area_id uuid references public.areas(id),
  payroll_id uuid references public.payrolls(id),
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  module text not null,
  record_id text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  related_document text,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index audit_logs_record_idx on public.audit_logs(module, record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(user_id, action, module, record_id, old_value, new_value)
  values (auth.uid(), tg_op, tg_table_name, coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','companies','areas','cost_centers','positions','work_types','projects','payment_concepts','payroll_types','employees','payroll_periods','payrolls','payroll_items','cooperative_settings','findings','payments','system_settings']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.areas enable row level security;
alter table public.cost_centers enable row level security;
alter table public.positions enable row level security;
alter table public.work_types enable row level security;
alter table public.projects enable row level security;
alter table public.payment_concepts enable row level security;
alter table public.payroll_types enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payrolls enable row level security;
alter table public.payroll_items enable row level security;
alter table public.cooperative_settings enable row level security;
alter table public.validations enable row level security;
alter table public.findings enable row level security;
alter table public.approvals enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.has_role('administrador'));
create policy profiles_admin_write on public.profiles for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy roles_self_read on public.user_roles for select using (user_id = auth.uid() or public.has_role('administrador'));
create policy roles_admin_write on public.user_roles for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy companies_authenticated_read on public.companies for select to authenticated using (deleted_at is null);
create policy companies_admin_write on public.companies for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy areas_scope_read on public.areas for select using (deleted_at is null and public.can_access_scope(company_id, id));
create policy areas_admin_write on public.areas for all using (public.has_role('administrador')) with check (public.has_role('administrador'));

do $$
declare table_name text;
begin
  foreach table_name in array array['cost_centers','positions','projects','employees','payroll_periods','payroll_items','attachments']
  loop
    execute format('create policy scope_read on public.%I for select using (deleted_at is null and public.can_access_scope(company_id, area_id))', table_name);
    execute format('create policy scope_insert on public.%I for insert with check (public.can_access_scope(company_id, area_id) and not public.has_role(''consulta''))', table_name);
    execute format('create policy scope_update on public.%I for update using (public.can_access_scope(company_id, area_id) and not public.has_role(''consulta'')) with check (public.can_access_scope(company_id, area_id))', table_name);
  end loop;
end $$;

create policy work_types_read on public.work_types for select to authenticated using (deleted_at is null);
create policy work_types_admin on public.work_types for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy concepts_read on public.payment_concepts for select to authenticated using (deleted_at is null);
create policy concepts_admin on public.payment_concepts for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy payroll_types_read on public.payroll_types for select to authenticated using (deleted_at is null);
create policy payroll_types_admin on public.payroll_types for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy system_settings_read on public.system_settings for select to authenticated using (deleted_at is null);
create policy system_settings_admin on public.system_settings for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy payrolls_scope_read on public.payrolls for select using (exists(select 1 from public.payroll_periods p where p.id = period_id and public.can_access_scope(p.company_id, p.area_id)));
create policy payrolls_scope_write on public.payrolls for all using (exists(select 1 from public.payroll_periods p where p.id = period_id and public.can_access_scope(p.company_id, p.area_id)) and not public.has_role('consulta')) with check (not public.has_role('consulta'));
create policy cooperative_scope on public.cooperative_settings for all using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id))) with check (not public.has_role('consulta'));
create policy validations_scope on public.validations for all using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id))) with check (not public.has_role('consulta'));
create policy findings_scope on public.findings for all using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id))) with check (not public.has_role('consulta'));
create policy approvals_scope_read on public.approvals for select using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id)));
create policy approvals_validators_insert on public.approvals for insert with check (public.has_role('administrador') or public.has_role('validador') or public.has_role('encargado_area'));
create policy payments_scope on public.payments for all using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id))) with check (public.has_role('administrador') or public.has_role('validador'));
create policy audit_read on public.audit_logs for select using (public.has_role('administrador') or public.has_role('validador'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payroll-evidence', 'payroll-evidence', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv','image/jpeg','image/png'])
on conflict (id) do nothing;
create policy evidence_read on storage.objects for select using (bucket_id = 'payroll-evidence' and auth.role() = 'authenticated');
create policy evidence_insert on storage.objects for insert with check (bucket_id = 'payroll-evidence' and auth.role() = 'authenticated' and not public.has_role('consulta'));
