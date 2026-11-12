package ec.elmirador.menu.infra;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.menu.domain.DishKind;
import ec.elmirador.menu.domain.LunchRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Repository
class JdbcLunchRepository implements LunchRepository {

	private final JdbcClient jdbc;

	private final JsonMapper json;

	JdbcLunchRepository(JdbcClient jdbc, JsonMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	@Override
	public List<LunchDish> lunchDishes() {
		return jdbc.sql("select id, kind, name::text as name, hidden from lunch_dish order by kind desc, name ->> 'es'")
			.query((rs, row) -> new LunchDish(rs.getLong("id"), DishKind.valueOf(rs.getString("kind")), label(rs.getString("name")),
					rs.getBoolean("hidden")))
			.list();
	}

	@Override
	public long createLunchDish(LunchDishForm form) {
		return jdbc.sql("insert into lunch_dish (kind, name, hidden) values (:kind, cast(:name as jsonb), :hidden) returning id")
			.param("kind", form.kind().name())
			.param("name", json.writeValueAsString(form.name()))
			.param("hidden", form.hidden())
			.query(Long.class)
			.single();
	}

	@Override
	public boolean updateLunchDish(long id, LunchDishForm form) {
		return jdbc.sql("update lunch_dish set kind = :kind, name = cast(:name as jsonb), hidden = :hidden where id = :id")
			.param("id", id)
			.param("kind", form.kind().name())
			.param("name", json.writeValueAsString(form.name()))
			.param("hidden", form.hidden())
			.update() == 1;
	}

	@Override
	public void publish(LocalDate date, LunchForm form, long staffId) {
		jdbc.sql("""
				insert into daily_menu (menu_date, includes, created_by) values (:date, cast(:includes as jsonb), :staff)
				on conflict (menu_date) do update set includes = excluded.includes, created_by = excluded.created_by
				""")
			.param("date", date)
			.param("includes", json.writeValueAsString(form.includes()))
			.param("staff", staffId)
			.update();
		var kept = form.dishes().stream().map(LunchDishPrice::lunchDishId).toList();
		jdbc.sql("select lunch_dish_id from daily_menu_dish where menu_date = :date")
			.param("date", date)
			.query(Long.class)
			.list()
			.stream()
			.filter(id -> !kept.contains(id))
			.forEach(id -> jdbc.sql("delete from daily_menu_dish where menu_date = :date and lunch_dish_id = :id")
				.param("date", date)
				.param("id", id)
				.update());
		for (var dish : form.dishes()) {
			jdbc.sql("""
					insert into daily_menu_dish (menu_date, lunch_dish_id, price_full, price_alone)
					values (:date, :dish, :full, :alone)
					on conflict (menu_date, lunch_dish_id) do update set price_full = excluded.price_full, price_alone = excluded.price_alone
					""")
				.param("date", date)
				.param("dish", dish.lunchDishId())
				.param("full", dish.priceFull())
				.param("alone", dish.priceAlone())
				.update();
		}
	}

	@Override
	public boolean unpublish(LocalDate date) {
		return jdbc.sql("delete from daily_menu where menu_date = :date").param("date", date).update() == 1;
	}

	@Override
	public boolean markSoldOut(LocalDate date, long dishId, boolean soldOut) {
		return jdbc.sql("update daily_menu_dish set sold_out = :soldOut where menu_date = :date and lunch_dish_id = :dish")
			.param("date", date)
			.param("dish", dishId)
			.param("soldOut", soldOut)
			.update() == 1;
	}

	private Map<String, String> label(String text) {
		return json.readValue(text, new TypeReference<Map<String, String>>() {
		});
	}

}
