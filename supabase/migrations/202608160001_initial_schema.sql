create extension if not exists pgcrypto;

create type public.app_role as enum ('Administrador', 'Validador', 'Digitador', 'Consulta', 'Encargado de área');
create type public.payroll_status as enum ('Borrador', 'Pendiente de revisión', 'Observada', 'Corregida', 'Aprobada', 'Rechazada', 'Pagada', 'Anulada');

create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null unique, tax_id text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.areas (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz, unique(company_id, name)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null, email text,
  company_id uuid references public.companies(id), area_id uuid references public.areas(id), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), role public.app_role not null,
  company_id uuid references public.companies(id), area_id uuid references public.areas(id), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id),
  deleted_at timestamptz, unique(user_id, role, company_id, area_id)
);
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), area_id uuid references public.areas(id),
  code text not null, name text not null, active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz, unique(company_id, code)
);
create table public.positions (
  id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.employees (
  id uuid primary key default gen_random_uuid(), code text not null unique, full_name text not null, dpi text unique, nit text unique,
  company_id uuid not null references public.companies(id), area_id uuid not null references public.areas(id), position_id uuid references public.positions(id),
  contract_type text not null, bank_account text, payment_method text not null, base_rate numeric(14,2) not null check(base_rate >= 0),
  admission_date date not null, notes text, active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create index employees_scope_idx on public.employees(company_id, area_id) where deleted_at is null;
create index employees_name_idx on public.employees(lower(full_name));

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(), code text not null unique, company_id uuid not null references public.companies(id),
  area_id uuid not null references public.areas(id), start_date date not null, end_date date not null check(end_date >= start_date),
  week smallint not null check(week between 1 and 53), year smallint not null, payroll_type text not null,
  status public.payroll_status not null default 'Borrador', entry_responsible uuid references public.profiles(id),
  review_responsible uuid references public.profiles(id), notes text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz
);
create index payroll_period_scope_idx on public.payroll_periods(company_id, area_id, year, week) where deleted_at is null;
create table public.payrolls (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references public.payroll_periods(id), header_total numeric(14,2),
  approved_by_luis_rivas boolean not null default false, secondary_signer text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.payment_concepts (
  id uuid primary key default gen_random_uuid(), name text not null unique, concept_type text not null check(concept_type in ('Ingreso','Descuento')),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.payroll_items (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null references public.payrolls(id), employee_id uuid not null references public.employees(id),
  days_worked numeric(6,2) not null default 0, regular_hours numeric(8,2) not null default 0, overtime_hours numeric(8,2) not null default 0,
  rate numeric(14,2) not null default 0, regular_salary numeric(14,2) not null default 0, overtime_pay numeric(14,2) not null default 0,
  work_pay numeric(14,2) not null default 0, bonus numeric(14,2) not null default 0, commissions numeric(14,2) not null default 0,
  other_income numeric(14,2) not null default 0, igss numeric(14,2) not null default 0, advances numeric(14,2) not null default 0,
  loans numeric(14,2) not null default 0, other_deductions numeric(14,2) not null default 0,
  total_income numeric(14,2) generated always as (regular_salary + overtime_pay + work_pay + bonus + commissions + other_income) stored,
  total_deductions numeric(14,2) generated always as (igss + advances + loans + other_deductions) stored,
  net_pay numeric(14,2) generated always as ((regular_salary + overtime_pay + work_pay + bonus + commissions + other_income) - (igss + advances + loans + other_deductions)) stored,
  payment_method text not null, reference text, notes text, validation_status text not null default 'Pendiente',
  source_file text, source_row integer, active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create index payroll_items_payroll_idx on public.payroll_items(payroll_id) where deleted_at is null;
create index payroll_items_employee_idx on public.payroll_items(employee_id) where deleted_at is null;
create index payroll_items_reference_idx on public.payroll_items(reference) where reference is not null and deleted_at is null;
create table public.cooperative_settings (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null unique references public.payrolls(id), enabled boolean not null default false,
  base_amount numeric(14,2) not null default 0, commission_rate numeric(7,4) not null default 5, vat_rate numeric(7,4) not null default 12,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.validations (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null references public.payrolls(id), executed_by uuid references auth.users(id),
  executed_at timestamptz not null default now(), rule_version text not null, summary jsonb not null default '{}'::jsonb
);
create table public.findings (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null references public.payrolls(id), employee_id uuid references public.employees(id),
  severity text not null check(severity in ('Crítico','Alto','Medio','Informativo')), rule text not null, affected_amount numeric(14,2) not null default 0,
  description text not null, recommendation text not null, status text not null default 'Abierto', assignee uuid references public.profiles(id),
  evidence text, resolved_at timestamptz, active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create index findings_payroll_idx on public.findings(payroll_id, severity, status) where deleted_at is null;
create table public.approvals (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null references public.payrolls(id), step text not null,
  decision text not null, comment text, decided_by uuid not null references auth.users(id), decided_at timestamptz not null default now(),
  previous_status public.payroll_status, new_status public.payroll_status
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), payroll_id uuid not null references public.payrolls(id), amount numeric(14,2) not null,
  payment_date date not null, reference text, status text not null, active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), payroll_id uuid references public.payrolls(id), company_id uuid not null references public.companies(id),
  area_id uuid references public.areas(id), storage_path text not null unique, file_name text not null, mime_type text not null,
  size_bytes bigint not null check(size_bytes between 1 and 10485760), category text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.system_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value jsonb not null, description text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), deleted_at timestamptz
);
create table public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id), action text not null, module text not null,
  record_id text not null, old_value jsonb, new_value jsonb, occurred_at timestamptz not null default now(),
  ip_address inet, reason text, document_id uuid references public.attachments(id)
);

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role = required_role and active and deleted_at is null) $$;
create or replace function public.can_access_scope(target_company uuid, target_area uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role('Administrador') or public.has_role('Validador') or public.has_role('Consulta')
  or exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.active and r.deleted_at is null
    and (r.company_id is null or r.company_id = target_company) and (r.area_id is null or r.area_id = target_area)) $$;
create or replace function public.audit_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(user_id, action, module, record_id, new_value) values(auth.uid(), tg_op, tg_table_name, new.id::text, to_jsonb(new)); return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(user_id, action, module, record_id, old_value, new_value) values(auth.uid(), tg_op, tg_table_name, new.id::text, to_jsonb(old), to_jsonb(new)); return new;
  end if;
  raise exception 'Physical deletion is not allowed; use soft delete';
end $$;
create or replace function public.prevent_paid_payroll_edit()
returns trigger language plpgsql set search_path = public
as $$
begin
  if exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = old.payroll_id and pp.status = 'Pagada')
    and not public.has_role('Administrador') then raise exception 'Paid payrolls can only be reopened by an administrator'; end if;
  return new;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['companies','areas','profiles','user_roles','cost_centers','positions','employees','payroll_periods','payrolls','payment_concepts','payroll_items','cooperative_settings','findings','payments','attachments','system_settings']
  loop execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_change()', table_name, table_name); end loop;
end $$;
create trigger protect_paid_items before update on public.payroll_items for each row execute function public.prevent_paid_payroll_edit();

alter table public.companies enable row level security;
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.cost_centers enable row level security;
alter table public.positions enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payrolls enable row level security;
alter table public.payment_concepts enable row level security;
alter table public.payroll_items enable row level security;
alter table public.cooperative_settings enable row level security;
alter table public.validations enable row level security;
alter table public.findings enable row level security;
alter table public.approvals enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

create policy authenticated_read_companies on public.companies for select to authenticated using (deleted_at is null);
create policy admin_manage_companies on public.companies for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy scoped_areas on public.areas for select to authenticated using (deleted_at is null and public.can_access_scope(company_id, id));
create policy admin_manage_areas on public.areas for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('Administrador'));
create policy admin_profiles on public.profiles for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy own_roles on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role('Administrador'));
create policy admin_roles on public.user_roles for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy authenticated_positions on public.positions for select to authenticated using (deleted_at is null);
create policy admin_positions on public.positions for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy authenticated_concepts on public.payment_concepts for select to authenticated using (deleted_at is null);
create policy admin_concepts on public.payment_concepts for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy scoped_cost_centers on public.cost_centers for select to authenticated using (deleted_at is null and public.can_access_scope(company_id, area_id));
create policy admin_cost_centers on public.cost_centers for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy scoped_employees on public.employees for select to authenticated using (deleted_at is null and public.can_access_scope(company_id, area_id));
create policy edit_employees on public.employees for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador')) with check (public.can_access_scope(company_id, area_id));
create policy scoped_periods on public.payroll_periods for select to authenticated using (deleted_at is null and public.can_access_scope(company_id, area_id));
create policy edit_periods on public.payroll_periods for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador') or public.has_role('Validador')) with check (public.can_access_scope(company_id, area_id));
create policy scoped_payrolls on public.payrolls for select to authenticated using (exists(select 1 from public.payroll_periods pp where pp.id = period_id and public.can_access_scope(pp.company_id, pp.area_id)));
create policy edit_payrolls on public.payrolls for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador') or public.has_role('Validador')) with check (true);
create policy scoped_items on public.payroll_items for select to authenticated using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id)));
create policy edit_items on public.payroll_items for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador')) with check (true);
create policy scoped_cooperative on public.cooperative_settings for select to authenticated using (exists(select 1 from public.payrolls p join public.payroll_periods pp on pp.id = p.period_id where p.id = payroll_id and public.can_access_scope(pp.company_id, pp.area_id)));
create policy edit_cooperative on public.cooperative_settings for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador')) with check (true);
create policy scoped_validations on public.validations for select to authenticated using (true);
create policy execute_validations on public.validations for insert to authenticated with check (public.has_role('Administrador') or public.has_role('Validador'));
create policy scoped_findings on public.findings for select to authenticated using (true);
create policy edit_findings on public.findings for all to authenticated using (public.has_role('Administrador') or public.has_role('Validador')) with check (true);
create policy scoped_approvals on public.approvals for select to authenticated using (true);
create policy create_approvals on public.approvals for insert to authenticated with check (decided_by = auth.uid() and (public.has_role('Administrador') or public.has_role('Validador') or public.has_role('Encargado de área')));
create policy scoped_payments on public.payments for select to authenticated using (true);
create policy admin_payments on public.payments for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));
create policy scoped_attachments on public.attachments for select to authenticated using (deleted_at is null and public.can_access_scope(company_id, area_id));
create policy edit_attachments on public.attachments for all to authenticated using (public.has_role('Administrador') or public.has_role('Digitador') or public.has_role('Validador')) with check (public.can_access_scope(company_id, area_id));
create policy read_audit on public.audit_logs for select to authenticated using (public.has_role('Administrador') or public.has_role('Validador'));
create policy read_settings on public.system_settings for select to authenticated using (deleted_at is null);
create policy admin_settings on public.system_settings for all to authenticated using (public.has_role('Administrador')) with check (public.has_role('Administrador'));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payroll-evidence', 'payroll-evidence', false, 10485760, array['application/pdf','image/jpeg','image/png','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;
create policy evidence_read on storage.objects for select to authenticated using (bucket_id = 'payroll-evidence');
create policy evidence_write on storage.objects for insert to authenticated with check (bucket_id = 'payroll-evidence' and (public.has_role('Administrador') or public.has_role('Digitador') or public.has_role('Validador')));
