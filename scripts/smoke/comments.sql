\set ON_ERROR_STOP on

do $$
declare
  missing text;
begin
  select string_agg(item, ', ') into missing
  from (
    select c.relname as item
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'databasechangelog%'
      and obj_description(c.oid, 'pg_class') is null
    union all
    select c.relname || '.' || a.attname
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'databasechangelog%'
      and a.attnum > 0 and not a.attisdropped and col_description(c.oid, a.attnum) is null
  ) as uncommented;
  if missing is not null then
    raise exception 'tables and columns without a comment: %', missing;
  end if;
end
$$;
