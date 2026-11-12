package ec.elmirador.menu.infra;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.menu.domain.MenuRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Repository
class JdbcMenuRepository implements MenuRepository {

	private final JdbcClient jdbc;

	private final JsonMapper json;

	JdbcMenuRepository(JdbcClient jdbc, JsonMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	@Override
	public List<CatalogCategory> categories() {
		var tree = jdbc.sql("""
				select coalesce(json_agg(c order by c.sort_order, c.id), '[]')
				from (
				  select mc.id, mc.name, mc.icon, mc.sort_order,
				    coalesce((
				      select json_agg(p order by p.sort_order, p.id)
				      from (
				        select p.id, p.name, p.description, p.dine_in_only, p.hidden, p.sold_out_on, p.photo, p.sort_order,
				          coalesce((
				            select json_agg(v order by v.sort_order, v.id)
				            from (select id, name, price, currency, sort_order from product_variant where product_id = p.id) v
				          ), '[]') as variants,
				          coalesce((
				            select json_agg(g order by g.sort_order, g.id)
				            from (
				              select g.id, g.name, g.min_choices, g.max_choices, g.sort_order,
				                coalesce((
				                  select json_agg(i order by i.sort_order, i.id)
				                  from (select id, name, hidden, sold_out_on, sort_order from option_item where option_group_id = g.id) i
				                ), '[]') as items
				              from option_group g where g.product_id = p.id
				            ) g
				          ), '[]') as option_groups
				        from product p where p.menu_category_id = mc.id
				      ) p
				    ), '[]') as products
				  from menu_category mc
				) c
				""").query(String.class).single();
		return json.readValue(tree, new TypeReference<List<CatalogCategory>>() {
		});
	}

	@Override
	public Optional<DailyMenu> dailyMenu(LocalDate date) {
		return jdbc.sql("""
				select json_build_object(
				  'date', d.menu_date,
				  'includes', d.includes,
				  'dishes', coalesce((
				    select json_agg(x order by x.kind desc, x.id)
				    from (
				      select ld.id, ld.kind, ld.name, dd.price_full, dd.price_alone, dd.currency, dd.sold_out
				      from daily_menu_dish dd join lunch_dish ld on ld.id = dd.lunch_dish_id
				      where dd.menu_date = d.menu_date
				    ) x
				  ), '[]'))
				from daily_menu d where d.menu_date = :date
				""").param("date", date).query(String.class).optional().map(row -> json.readValue(row, DailyMenu.class));
	}

}
