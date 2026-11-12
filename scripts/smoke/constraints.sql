\set ON_ERROR_STOP on
\encoding UTF8

begin;

create function pg_temp.rejects(statement text) returns void language plpgsql as $$
declare
  accepted boolean := false;
begin
  begin
    execute statement;
    accepted := true;
  exception when integrity_constraint_violation then
    null;
  end;
  if accepted then
    raise exception 'the database accepted: %', statement;
  end if;
end
$$;

select pg_temp.rejects($$insert into menu_category (name, icon) values ('{"en": "Drinks"}', 'beer')$$);
select pg_temp.rejects($$insert into menu_category (name, icon) values ('{"es": 1}', 'beer')$$);
select pg_temp.rejects($$insert into menu_category (name, icon) values ('["Bebidas"]', 'beer')$$);
select pg_temp.rejects($$delete from menu_category where id = (select menu_category_id from product limit 1)$$);
select pg_temp.rejects($$insert into product_variant (product_id, price, currency) values ((select min(id) from product), 1, 'usd')$$);
select pg_temp.rejects($$insert into product_variant (product_id, price) values ((select min(id) from product), -1)$$);
select pg_temp.rejects($$insert into option_group (product_id, name, min_choices, max_choices) values ((select min(id) from product), '{"es": "x"}', 2, 1)$$);
select pg_temp.rejects($$insert into option_group (product_id, name, min_choices, max_choices) values ((select min(id) from product), '{"es": "x"}', 0, 0)$$);
select pg_temp.rejects($$insert into lunch_dish (kind, name) values ('dessert', '{"es": "Flan"}')$$);
select pg_temp.rejects($$insert into daily_menu_dish (menu_date, lunch_dish_id, price_alone) values ((select max(menu_date) from daily_menu), (select max(id) from lunch_dish), -2)$$);
select pg_temp.rejects($$insert into weekly_hours (weekday, opens_at, closes_at) values (8, '08:00', '20:00')$$);
select pg_temp.rejects($$insert into hours_override (override_date, opens_at, closes_at) values ('2099-01-01', '20:00', '08:00')$$);
select pg_temp.rejects($$insert into hours_override (override_date, opens_at) values ('2099-01-02', '08:00')$$);
select pg_temp.rejects($$insert into hours_override (override_date, lunch_starts_at, lunch_ends_at) values ('2099-01-03', '14:00', '11:00')$$);
select pg_temp.rejects($$insert into store_status_change (status) values ('busy')$$);
select pg_temp.rejects($$insert into store_status_change (status, wait_minutes) values ('delayed', 0)$$);
select pg_temp.rejects($$insert into store_profile (id, name) values (2, 'Otro local')$$);
select pg_temp.rejects($$insert into store_profile (name) values ('Otro local')$$);
select pg_temp.rejects($$update store_profile set whatsapp = '+593 99 123 4567'$$);

rollback;
