package ec.elmirador.menu.infra;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.menu.domain.CatalogRepository;
import tools.jackson.databind.json.JsonMapper;

@Repository
class JdbcCatalogRepository implements CatalogRepository {

	private final JdbcClient jdbc;

	private final JsonMapper json;

	JdbcCatalogRepository(JdbcClient jdbc, JsonMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	@Override
	public long createCategory(CategoryForm form) {
		return jdbc.sql("""
				insert into menu_category (name, description, icon, sort_order)
				values (cast(:name as jsonb), cast(:description as jsonb), :icon,
				  (select coalesce(max(sort_order), 0) + 1 from menu_category))
				returning id
				""")
			.param("name", text(form.name()))
			.param("description", nullableText(form.description()))
			.param("icon", form.icon())
			.query(Long.class)
			.single();
	}

	@Override
	public boolean updateCategory(long id, CategoryForm form) {
		return jdbc.sql("""
				update menu_category set name = cast(:name as jsonb), description = cast(:description as jsonb), icon = :icon
				where id = :id
				""")
			.param("id", id)
			.param("name", text(form.name()))
			.param("description", nullableText(form.description()))
			.param("icon", form.icon())
			.update() == 1;
	}

	@Override
	public void orderCategories(List<Long> ids) {
		for (var position = 0; position < ids.size(); position++) {
			jdbc.sql("update menu_category set sort_order = :position where id = :id")
				.param("id", ids.get(position))
				.param("position", position)
				.update();
		}
	}

	@Override
	public void orderProducts(long categoryId, List<Long> ids) {
		for (var position = 0; position < ids.size(); position++) {
			jdbc.sql("update product set sort_order = :position where id = :id and menu_category_id = :category")
				.param("id", ids.get(position))
				.param("category", categoryId)
				.param("position", position)
				.update();
		}
	}

	@Override
	public boolean deleteCategory(long id) {
		return jdbc.sql("delete from menu_category where id = :id").param("id", id).update() == 1;
	}

	@Override
	public long createProduct(ProductForm form) {
		var id = jdbc.sql("""
				insert into product (menu_category_id, name, description, dine_in_only, hidden, sort_order)
				values (:category, cast(:name as jsonb), cast(:description as jsonb), :dineInOnly, :hidden,
				  (select coalesce(max(sort_order), 0) + 1 from product where menu_category_id = :category))
				returning id
				""").params(product(form)).query(Long.class).single();
		saveChildren(id, form);
		return id;
	}

	@Override
	public boolean updateProduct(long id, ProductForm form) {
		var params = product(form);
		params.put("id", id);
		var updated = jdbc.sql("""
				update product set menu_category_id = :category, name = cast(:name as jsonb),
				  description = cast(:description as jsonb), dine_in_only = :dineInOnly, hidden = :hidden
				where id = :id
				""").params(params).update() == 1;
		if (updated) {
			saveChildren(id, form);
		}
		return updated;
	}

	@Override
	public boolean deleteProduct(long id) {
		return jdbc.sql("delete from product where id = :id").param("id", id).update() == 1;
	}

	@Override
	public Optional<Optional<String>> photo(long productId) {
		return jdbc.sql("select photo from product where id = :id")
			.param("id", productId)
			.query((rs, row) -> Optional.ofNullable(rs.getString("photo")))
			.optional();
	}

	@Override
	public void setPhoto(long productId, String photo) {
		jdbc.sql("update product set photo = :photo where id = :id").param("id", productId).param("photo", photo).update();
	}

	@Override
	public boolean markProductSoldOut(long id, LocalDate on) {
		return jdbc.sql("update product set sold_out_on = :on where id = :id").param("id", id).param("on", on).update() == 1;
	}

	@Override
	public boolean markOptionItemSoldOut(long id, LocalDate on) {
		return jdbc.sql("update option_item set sold_out_on = :on where id = :id").param("id", id).param("on", on).update() == 1;
	}

	private Map<String, Object> product(ProductForm form) {
		var params = new HashMap<String, Object>();
		params.put("category", form.categoryId());
		params.put("name", text(form.name()));
		params.put("description", nullableText(form.description()));
		params.put("dineInOnly", form.dineInOnly());
		params.put("hidden", form.hidden());
		return params;
	}

	private void saveChildren(long productId, ProductForm form) {
		var variants = keep("product_variant", "product_id", productId, form.variants().stream().map(VariantForm::id).toList());
		for (var position = 0; position < form.variants().size(); position++) {
			var variant = form.variants().get(position);
			var sql = variants.contains(variant.id())
					? "update product_variant set name = cast(:name as jsonb), price = :price, sort_order = :position where id = :id"
					: "insert into product_variant (product_id, name, price, sort_order) values (:parent, cast(:name as jsonb), :price, :position)";
			jdbc.sql(sql)
				.param("id", variant.id())
				.param("parent", productId)
				.param("name", nullableText(variant.name()))
				.param("price", variant.price())
				.param("position", position)
				.update();
		}
		var groups = keep("option_group", "product_id", productId, form.optionGroups().stream().map(OptionGroupForm::id).toList());
		for (var position = 0; position < form.optionGroups().size(); position++) {
			var group = form.optionGroups().get(position);
			var params = Map.<String, Object>of("parent", productId, "name", text(group.name()), "min", group.minChoices(),
					"max", group.maxChoices(), "position", position);
			long groupId;
			if (groups.contains(group.id())) {
				groupId = group.id();
				jdbc.sql("""
						update option_group set name = cast(:name as jsonb), min_choices = :min, max_choices = :max, sort_order = :position
						where id = :id
						""").params(params).param("id", groupId).update();
			}
			else {
				groupId = jdbc.sql("""
						insert into option_group (product_id, name, min_choices, max_choices, sort_order)
						values (:parent, cast(:name as jsonb), :min, :max, :position) returning id
						""").params(params).query(Long.class).single();
			}
			saveItems(groupId, group.items());
		}
	}

	private void saveItems(long groupId, List<OptionItemForm> items) {
		var kept = keep("option_item", "option_group_id", groupId, items.stream().map(OptionItemForm::id).toList());
		for (var position = 0; position < items.size(); position++) {
			var item = items.get(position);
			var params = Map.<String, Object>of("parent", groupId, "name", text(item.name()), "hidden", item.hidden(),
					"position", position);
			if (kept.contains(item.id())) {
				jdbc.sql("update option_item set name = cast(:name as jsonb), hidden = :hidden, sort_order = :position where id = :id")
					.params(params)
					.param("id", item.id())
					.update();
			}
			else {
				jdbc.sql("insert into option_item (option_group_id, name, hidden, sort_order) values (:parent, cast(:name as jsonb), :hidden, :position)")
					.params(params)
					.update();
			}
		}
	}

	private List<Long> keep(String table, String parentColumn, long parentId, List<Long> requested) {
		var existing = jdbc.sql("select id from " + table + " where " + parentColumn + " = :parent")
			.param("parent", parentId)
			.query(Long.class)
			.list();
		existing.stream()
			.filter(id -> !requested.contains(id))
			.forEach(id -> jdbc.sql("delete from " + table + " where id = :id").param("id", id).update());
		return requested.stream().filter(Objects::nonNull).filter(existing::contains).toList();
	}

	private String text(Map<String, String> label) {
		return json.writeValueAsString(label);
	}

	private String nullableText(Map<String, String> label) {
		return label == null ? null : text(label);
	}

}
