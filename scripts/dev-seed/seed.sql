\set ON_ERROR_STOP on
\encoding UTF8

set client_min_messages = warning;

begin;

truncate menu_category, lunch_dish, daily_menu, weekly_hours, hours_override, store_status_change, staff_user restart identity cascade;

create function pg_temp.es(text) returns jsonb language sql immutable strict as $$ select jsonb_build_object('es', $1) $$;

insert into staff_user (id, name, role, pin_hash) values
  (1, 'Encargada', 'admin', '$2a$10$EAarItqPhhKVDRIJ1/bEQ.LiKaKFdvEUGLvTQwk3oorrr4ozT6NLW'),
  (2, 'Mesero', 'floor', '$2a$10$AkVmktHbbqBvQgtvAfOIseqbOK7hWhXMDTIHR69DpIfd/SnPbdjT.'),
  (3, 'Cocina', 'kitchen', '$2a$10$njX1yU4.LNqv5IBcqAn0R.iA4Q9rRP/HLyj8nm5t7oWcmMB.Uv1R.');

insert into menu_category (id, name, icon) values
  (1, pg_temp.es('Bolones'), 'egg-fried'),
  (2, pg_temp.es('Parrilla'), 'beef'),
  (3, pg_temp.es('Especiales de la casa'), 'chef-hat'),
  (4, pg_temp.es('Picaditas'), 'drumstick'),
  (5, pg_temp.es('Guarniciones y extras'), 'salad'),
  (6, pg_temp.es('Bebidas sin alcohol'), 'cup-soda'),
  (7, pg_temp.es('Bebidas con alcohol'), 'beer'),
  (8, pg_temp.es('Media tarde'), 'coffee'),
  (9, pg_temp.es('Zaruma tradicional'), 'soup'),
  (10, pg_temp.es('Mariscos'), 'shrimp');

insert into product (id, menu_category_id, name, description, dine_in_only) values
  (1, 1, pg_temp.es('Tradicional'), pg_temp.es('Bolón de maní, queso, huevo frito'), false),
  (2, 1, pg_temp.es('Milenario'), pg_temp.es('Chicharrón y queso fundido'), false),
  (3, 1, pg_temp.es('Bolón express'), pg_temp.es('Chicharrón, bistec de carne, huevo frito'), false),
  (4, 1, pg_temp.es('Madurito'), pg_temp.es('Bolón de maduro, chicharrón, queso mozzarella, huevo frito'), false),
  (5, 1, pg_temp.es('Rey bolón'), pg_temp.es('Chicharrón, queso, tocino, mozzarella, bistec de carne y huevo frito'), false),
  (6, 1, pg_temp.es('Paladar zarumeño'), pg_temp.es('Patacón gigante, pollo, chicharrón, choclo y queso fundido, salsa blanca y roja'), false),
  (7, 1, pg_temp.es('Jugoso'), pg_temp.es('Chicharrón y seco de pollo o chancho'), false),
  (8, 1, pg_temp.es('Costeñito'), pg_temp.es('Chicharrón, tocino, salsa de camarón'), false),
  (9, 1, pg_temp.es('Mixto'), pg_temp.es('Queso, chicharrón, bistec, huevo frito'), false),
  (10, 1, pg_temp.es('Universo de sabores'), pg_temp.es('Tres mini bolones, patacones, bistec, porción de tigrillo'), false),
  (11, 1, pg_temp.es('Crocante de maduro'), pg_temp.es('Plátano maduro, choclo, carnes al carbón, queso fundido, salsa blanca y roja'), false),
  (12, 1, pg_temp.es('Torta bolón'), pg_temp.es('De chicharrón, de queso o mixta'), false),
  (13, 2, pg_temp.es('Parrillada familiar'), pg_temp.es('Filete de res, chancho, pollo, chorizo ahumado, ternera, chorizo paisa, porción de choclo, papas al carbón, patacones, arroz, menestra, ensalada fresca'), false),
  (14, 2, pg_temp.es('Parrillada especial'), pg_temp.es('Chuleta de lomo, filete de pollo, ternera, chorizo parrillero, patacones, arroz, menestra, ensalada fresca'), false),
  (15, 2, pg_temp.es('Parrillada junior'), pg_temp.es('Filete de pollo o chancho, papas fritas, ensalada fresca'), false),
  (16, 3, pg_temp.es('Costilla de chancho'), pg_temp.es('Papas al carbón, choclo, ensalada fresca'), false),
  (17, 3, pg_temp.es('Costilla de chancho con salsa BBQ'), pg_temp.es('Papas al carbón, choclo, ensalada fresca'), false),
  (18, 3, pg_temp.es('Filete'), pg_temp.es('Arroz, menestra, patacones, ensalada fresca'), false),
  (19, 3, pg_temp.es('Filete mixto'), pg_temp.es('Dos carnes con arroz, menestra, patacones, ensalada fresca'), false),
  (20, 3, pg_temp.es('Panceta'), pg_temp.es('Arroz, menestra, patacones, ensalada fresca'), false),
  (21, 3, pg_temp.es('Churrasco'), pg_temp.es('Arroz, huevo frito, papas fritas, bistec, ensalada fresca'), false),
  (22, 4, pg_temp.es('Alitas'), pg_temp.es('6 alitas, papas fritas y ensalada fresca'), false),
  (23, 4, pg_temp.es('Picadita de la casa'), pg_temp.es('Chorizo paisa, ternera, huevo frito, salchicha, pollo, papas fritas, salsa blanca y salsa roja'), false),
  (24, 4, pg_temp.es('Picadita parrillera'), pg_temp.es('Pollo, chancho, chorizo, patacones, yuca frita, maduros fritos, salsa roja y salsa blanca'), false),
  (25, 4, pg_temp.es('Balcón Mirador'), pg_temp.es('Panceta, chorizo paisa, ternera, papas fritas, maduros fritos, queso fundido'), false),
  (26, 4, pg_temp.es('Delicia secreta'), pg_temp.es('Carne molida, tocino, papas rústicas, choclo, ensalada pico de gallo, salsa de queso'), false),
  (27, 4, pg_temp.es('Sayayin'), pg_temp.es('Chancho, res, pollo, panceta, chorizo paisa, ternera, maduros fritos, maíz dulce, papas fritas, queso fundido'), false),
  (28, 5, pg_temp.es('Patacones'), null, false),
  (29, 5, pg_temp.es('Yuca frita'), null, false),
  (30, 5, pg_temp.es('Plátanos maduros fritos'), null, false),
  (31, 5, pg_temp.es('Papas al carbón'), null, false),
  (32, 5, pg_temp.es('Arroz con menestra'), null, false),
  (33, 5, pg_temp.es('Ensalada fresca'), null, false),
  (34, 5, pg_temp.es('Chorizo (unidad)'), null, false),
  (35, 5, pg_temp.es('Salsa de maní'), null, false),
  (36, 5, pg_temp.es('Morcilla'), null, false),
  (37, 5, pg_temp.es('Moro con lenteja y queso mozzarella'), null, false),
  (38, 5, pg_temp.es('Moro con arveja y queso mozzarella'), null, false),
  (39, 5, pg_temp.es('Moro de fréjol criollo y queso mozzarella'), null, false),
  (40, 5, pg_temp.es('Moro de choclo y queso mozzarella'), null, false),
  (41, 6, pg_temp.es('Taza de café'), null, false),
  (42, 6, pg_temp.es('Té'), null, false),
  (43, 6, pg_temp.es('Chocolate'), null, false),
  (44, 6, pg_temp.es('Batido'), null, false),
  (45, 6, pg_temp.es('Jugo'), pg_temp.es('Vaso de jugo natural'), false),
  (46, 6, pg_temp.es('Jarra de jugo'), pg_temp.es('Jugo natural para compartir'), true),
  (47, 7, pg_temp.es('Vino hervido'), null, true),
  (48, 7, pg_temp.es('Sangría'), null, true),
  (49, 8, pg_temp.es('Yuca con morcilla al carbón'), null, false),
  (50, 8, pg_temp.es('Mote pillo'), null, false),
  (51, 8, pg_temp.es('Humas, café y queso'), null, false),
  (52, 8, pg_temp.es('Tamales, café y queso'), null, false),
  (53, 8, pg_temp.es('Empanada de verde rellena con pollo'), null, false),
  (54, 8, pg_temp.es('Bolón mixto de maní, queso y chancho al carbón'), null, false),
  (55, 9, pg_temp.es('Tigrillo'), null, false),
  (56, 9, pg_temp.es('Tigrillo con bistec'), null, false),
  (57, 9, pg_temp.es('Tigrillo con carne frita'), null, false),
  (58, 9, pg_temp.es('Arroz mote'), null, false),
  (59, 9, pg_temp.es('Pipiolo'), pg_temp.es('Arroz mote, queso y salsa de maní'), false),
  (60, 10, pg_temp.es('Ceviche de camarón'), null, false),
  (61, 10, pg_temp.es('Camarón apanado'), null, false),
  (62, 10, pg_temp.es('Chaulafán'), null, false),
  (63, 10, pg_temp.es('Chopsuey de camarón'), null, false),
  (64, 6, pg_temp.es('Gaseosa'), null, false),
  (65, 7, pg_temp.es('Michelada'), null, true);

insert into product_variant (product_id, price) values
  (1, 3.00), (2, 3.75), (3, 4.00), (4, 4.00), (5, 5.00), (6, 5.00), (7, 3.50), (8, 5.00), (9, 4.00),
  (10, 9.99), (11, 4.99), (12, 9.99), (13, 35.00), (14, 6.99), (15, 3.75), (16, 4.50), (17, 5.00),
  (18, 4.00), (19, 6.00), (20, 4.50), (21, 7.50), (22, 5.00), (23, 10.00), (24, 10.00), (25, 8.00),
  (26, 8.00), (27, 17.00), (28, 3.00), (29, 3.00), (30, 3.00), (31, 3.00), (32, 2.00), (33, 2.50),
  (34, 1.50), (35, 2.00), (36, 3.50), (37, 3.50), (38, 3.50), (39, 3.50), (40, 2.50), (41, 1.00),
  (42, 1.00), (43, 1.75), (44, 2.50), (45, 2.00), (47, 15.00), (48, 12.00), (49, 4.50), (50, 3.50),
  (51, 3.50), (52, 3.50), (53, 1.00), (54, 4.00), (59, 4.50), (60, 6.00), (61, 7.00), (63, 6.00);

insert into product_variant (product_id, name, price) values
  (46, pg_temp.es('Jarra'), 5.00),
  (46, pg_temp.es('Media jarra'), 2.50),
  (55, pg_temp.es('Entero'), 4.00),
  (55, pg_temp.es('Medio'), 3.00),
  (56, pg_temp.es('Entero'), 5.00),
  (56, pg_temp.es('Medio'), 3.75),
  (57, pg_temp.es('Entero'), 5.00),
  (57, pg_temp.es('Medio'), 3.75),
  (58, pg_temp.es('Clásico, solo queso'), 3.00),
  (58, pg_temp.es('Con carne frita de chancho'), 5.00),
  (58, pg_temp.es('Con carne seca, completo'), 5.00),
  (58, pg_temp.es('Con carne seca, medio'), 4.00),
  (62, pg_temp.es('Entero'), 8.00),
  (62, pg_temp.es('Medio'), 4.50),
  (64, pg_temp.es('Personal'), 0.75),
  (64, pg_temp.es('Litro'), 1.25),
  (64, pg_temp.es('Familiar, 3 litros'), 3.50),
  (65, pg_temp.es('Pequeña'), 2.00),
  (65, pg_temp.es('Grande'), 3.50);

insert into option_group (id, product_id, name, min_choices, max_choices) values
  (1, 7, pg_temp.es('Seco'), 1, 1),
  (2, 12, pg_temp.es('Relleno'), 1, 1),
  (3, 15, pg_temp.es('Carne'), 1, 1),
  (4, 18, pg_temp.es('Carne'), 1, 1),
  (5, 19, pg_temp.es('Carnes'), 2, 2),
  (6, 22, pg_temp.es('Salsa'), 1, 1),
  (7, 45, pg_temp.es('Sabor'), 1, 1),
  (8, 46, pg_temp.es('Sabor'), 1, 1);

insert into option_item (option_group_id, name)
select group_id, pg_temp.es(item)
from (values
  (1, 'Pollo'), (1, 'Chancho'),
  (2, 'Chicharrón'), (2, 'Queso'), (2, 'Mixta'),
  (3, 'Pollo'), (3, 'Chancho'),
  (4, 'Res'), (4, 'Chancho'), (4, 'Pollo'),
  (5, 'Res'), (5, 'Chancho'), (5, 'Pollo'),
  (6, 'BBQ'), (6, 'Maracuyá'), (6, 'Búfalo'), (6, 'Piña'), (6, 'Miel mostaza')
) as items (group_id, item);

insert into option_item (option_group_id, name)
select flavors.group_id, pg_temp.es(fruit)
from (values (7), (8)) as flavors (group_id)
cross join unnest(array['Mora', 'Fresa', 'Maracuyá', 'Limón', 'Piña', 'Tomate de árbol', 'Melón', 'Papaya']) with ordinality as fruits (fruit, position)
order by flavors.group_id, position;

insert into lunch_dish (id, kind, name) values
  (1, 'soup', pg_temp.es('Caldo de gallina criolla')),
  (2, 'soup', pg_temp.es('Sopa de quinua')),
  (3, 'soup', pg_temp.es('Locro de papa')),
  (4, 'main', pg_temp.es('Seco de pollo')),
  (5, 'main', pg_temp.es('Estofado de carne')),
  (6, 'main', pg_temp.es('Pescado frito')),
  (7, 'main', pg_temp.es('Chuleta a la plancha')),
  (8, 'main', pg_temp.es('Guatita')),
  (9, 'main', pg_temp.es('Arroz con menestra y carne asada'));

insert into daily_menu (menu_date, includes)
values ((now() at time zone 'America/Guayaquil')::date, pg_temp.es('Jugo de naranjilla y gelatina'));

insert into daily_menu_dish (menu_date, lunch_dish_id, price_full, price_alone)
select menu_date, dish_id, price_full, price_alone
from daily_menu
cross join (values (1, null, 1.50), (2, null, 1.50), (4, 3.50, 3.00), (5, 3.75, 3.25), (6, 4.00, 3.50)) as dishes (dish_id, price_full, price_alone);

insert into weekly_hours (weekday, opens_at, closes_at, lunch_starts_at, lunch_ends_at)
select weekday, time '07:30', time '21:00', time '11:00', time '14:00' from generate_series(1, 7) as weekday;

select setval(pg_get_serial_sequence('menu_category', 'id'), max(id)) from menu_category;
select setval(pg_get_serial_sequence('product', 'id'), max(id)) from product;
select setval(pg_get_serial_sequence('option_group', 'id'), max(id)) from option_group;
select setval(pg_get_serial_sequence('lunch_dish', 'id'), max(id)) from lunch_dish;
select setval(pg_get_serial_sequence('staff_user', 'id'), max(id)) from staff_user;

commit;
