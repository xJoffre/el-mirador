# El Mirador: guía interna

Sistema de pedidos del bar-restaurante El Mirador (Zaruma, Ecuador). La arquitectura y el plan por semanas están en `El-Mirador-arquitectura.html` (carpeta compartida de cconnect); el código y las migraciones mandan sobre ese documento.

## Estructura

- `backend/`: Spring Boot 4 con Maven, Java 25, paquete `ec.elmirador`. Un paquete por módulo (`menu`, `schedule`, `orders`, `invoicing`, `staff`) con `api/` (rutas), `domain/` (servicios y puertos) e `infra/` (repositorios SQL). `shared/` guarda solo mecanismos: configuración (`AppProperties`), reloj en la zona del local (`Clock`), errores (`ApiException`) y el canal SSE (`EventStream`).
- `web/`: React + Vite + TypeScript. `src/app/` (rutas y proveedores; `/ingreso` y `/panel` se cargan aparte para que el sitio del cliente no baje el panel), `src/shared/api/` (generado por orval, no se edita), `src/shared/ui/` (shadcn/ui), `src/shared/theme/theme.css` (los únicos colores, fuentes y radios), `src/shared/i18n/<idioma>/<espacio>.json` (textos), `src/features/<funcionalidad>/`.
- `api/openapi.json`: el contrato exportado por el backend. Su diff es la revisión de cada cambio de la API.
- `scripts/smoke/`: pruebas de humo contra el sistema real (`node scripts/smoke/<nombre>.ts <url>`). `menu.ts` valida las respuestas con los esquemas zod generados y compara los conteos con la base vía `psql` (usa `PGHOST`, `PGDATABASE`, `PGUSER` y `PGPASSWORD`). `availability.ts` cambia datos en la base, revisa que la API los refleje y al final restaura con el seeder. `live.ts` escucha `/api/events` y exige que cada cambio llegue como aviso. `orders.ts` recorre un pedido completo y comprueba que el precio y el total los pone la base. `invoicing.ts` prueba la caja: cancelar, cobrar por transferencia, confirmarla, anotar la factura y el CSV del contador. `comments.sql` falla si una tabla o columna no tiene comentario, y `constraints.sql`, si la base acepta datos inválidos.
- `scripts/dev-seed/seed.sql`: la carta real y datos de prueba, solo para desarrollo. Se puede correr de nuevo: vacía y vuelve a llenar (`psql -f scripts/dev-seed/seed.sql`).
- `scripts/new-migration.ts`: el generador de migraciones (`node scripts/new-migration.ts <nombre-en-kebab>`). Nunca se nombra un archivo de migración a mano.
- `deploy/`: `Dockerfile`, `docker-compose.yml` (PostgreSQL, app, Caddy) y `Caddyfile`.

## Configuración

Un solo archivo: `.env` en la raíz (plantilla en `.env.example`, el real nunca se sube). Lo leen Spring (`spring.config.import`) y Docker Compose (`env_file`). En el código, la configuración propia se pide a `AppProperties`; nadie lee variables de entorno directamente. `FIRST_ADMIN_NAME` y `FIRST_ADMIN_PIN` crean la primera encargada solo si no hay nadie en el equipo (producción). `PHOTOS_DIR` es la carpeta de las fotos, servidas en `/photos/`.

Usuarios del seeder de desarrollo: Encargada `123456`, Mesero `222222`, Cocina `333333`.

## Seguridad

- Ingreso con nombre y PIN de 6 dígitos (`StaffService.PIN_LENGTH`, publicado en el contrato). 5 PIN errados bloquean a esa persona 15 minutos; cada intento bloquea su fila (`for update`), así los intentos en paralelo no se saltan el conteo.
- Sesión de Spring en memoria (14 h), cookie `SameSite=Lax` y `Secure` detrás de Caddy (`forward-headers-strategy=native`). CSRF con `csrf.spa()`: la web manda `X-XSRF-TOKEN` desde `src/shared/lib/request.ts`.
- Los permisos por ruta están en un solo lugar: `staff/api/SecurityConfiguration`. Lo que no está listado es solo para la encargada. Una ruta nueva suma su fila en `PermissionsTest`, que prueba cada ruta con cada rol.
- `StaffSessionFilter` relee al usuario en cada pedido: desactivarlo o cambiarle el rol corta su sesión abierta al instante.

## Ciclo del contrato

Con el backend corriendo: `cd web && npm run api` (exporta `api/openapi.json` y regenera el cliente y los esquemas zod), y luego `npm run build` (chequeo de tipos). Los tres pasos van en el mismo commit. La integración continua falla si el contrato regenerado difiere del que está en el repo.

## Reglas

- Sin comentarios en el código. La documentación vive como datos: `COMMENT` en inglés en cada tabla y columna, y las etiquetas en los JSON de i18n.
- Las migraciones Liquibase son SQL con formato (`--changeset`, `--rollback`), creadas con `scripts/new-migration.ts` en `backend/src/main/resources/db/changelog/changes/`. La CI las aplica, las deshace y las vuelve a aplicar. Los textos traducibles usan el tipo `localized_text` (jsonb con `es` obligatorio) y la moneda, el tipo `currency_code`. Ojo: JDBC toma el `?` de jsonb como parámetro; se usa `jsonb_typeof(x -> 'clave')`. Un `CHECK` que da `NULL` se da por cumplido: se escribe con `is not distinct from` o `coalesce`, y cada regla nueva suma un caso en `scripts/smoke/constraints.sql`.
- Los valores derivados los calcula la base con triggers, y cada uno lleva su `comment on function`. La lista completa, que se mantiene al día:
  - `order_line_price` (antes de insertar o cambiar una línea): copia el precio vigente de la variante o del almuerzo del día y no deja cambiarlo después. El cliente nunca manda precios.
  - `order_total` (después de cambiar líneas): recalcula `customer_order.total` y su moneda.
  - `order_status` (después de insertar un cambio de estado): copia el estado en `customer_order.status`, rechaza cambios sobre un pedido cerrado o cancelado y no deja cerrar sin pagos que cubran el total.
- Un pedido tiene tres estados guardados (abierto, cerrado, cancelado). Lo que ve el cliente (`OrderState`: recibido, en preparación, listo, entregado) se deriva de las rondas de cocina (`started_at`, `ready_at`), no se guarda.
- `orders` consulta la carta y el horario a través de su puerto `Offer`, implementado con los servicios públicos de `menu` y `schedule`.
- Las facturas las emite el contador. El pedido guarda la solicitud con los datos del cliente; la encargada anota el número de factura solo cuando el pedido está cobrado (`invoicing.notPaid` si no). `sales.csv` es lo que se le pasa: UTF-8 con BOM, separado por comas, con fila de totales y celdas que empiezan con `=`, `+`, `-` o `@` neutralizadas.
- Una violación de clave foránea llega a la web como `shared.inUse` (por ejemplo, borrar un plato que ya se vendió).
- Nunca `JdbcClient...query(...).stream()`: ese `Stream` retiene la conexión hasta cerrarlo y agota el pool (pasó en la semana 4). Se usa `.list()`; `menu.ts` hace 30 visitas seguidas para detectarlo.
- Los repositorios usan `JdbcClient` con SQL escrito a mano; son el único lugar con SQL. Las filas planas se mapean con `query(Registro.class)` (snake_case a camelCase solo) y los árboles, con `json_agg` más el `JsonMapper`. Los servicios reciben un puerto (interfaz con sus records en `domain/`) y las pruebas unitarias le pasan un record que lo implementa en memoria, con un `Clock` fijo.
- La API habla JSON en snake_case y siempre manda todas las claves. Un campo que puede ser nulo lleva `@Nullable` de `jakarta.annotation`; el resto sale obligatorio en el contrato. Si es una referencia a otro objeto, `SharedConfiguration` la publica como `oneOf: [ref, null]`.
- Los valores de enums viajan tal cual se guardan (`open`, `soup`), por eso las constantes van en minúsculas.
- Los errores de negocio son `new ApiException(status, "modulo.clave")`: el estado HTTP real y una clave i18n en `code`. La web la traduce con `errorText()` desde `src/shared/i18n/es/errors.json`; los valores extra del error (por ejemplo `until`) se interpolan.
- Los módulos no se importan entre sí: se hablan por contratos publicados y eventos. Para avisar al navegador, el servicio publica `Menu.CHANGED` o `Schedule.CHANGED` con `ApplicationEventPublisher`; `EventStream` lo reenvía por SSE después del commit, y `src/shared/lib/live.ts` refresca las consultas de ese tema (`menu` o `schedule`). Quién hizo un cambio llega al controlador con `@AuthenticationPrincipal(expression = "id()") long staffId`, sin importar el módulo `staff`.
- Las horas se guardan como `timestamptz`; "hoy" se calcula con el `Clock` inyectado (America/Guayaquil), y la sesión de PostgreSQL usa la misma zona.
- Web: la prueba de punta a punta (`web/e2e`, Playwright) pide en la web, marca listo en la cocina y espera que el seguimiento cambie solo. Se corre con el sistema arriba: `npm run e2e`.
- Web: el carrito del sitio (`features/site/cart.ts`) guarda solo ids y cantidades; nombres, precios y disponibilidad se calculan siempre con la carta actual. Sus reglas tienen pruebas con Vitest (`npm test`).
- Web: los datos del servidor se leen con los hooks que genera orval (TanStack Query) y los formularios validan con los esquemas zod generados (`zodResolver`). Un error de mutación se muestra solo como aviso (`MutationCache`). El naranja de marca (`brand`, #F4510B) es para títulos grandes; los botones usan `primary` (#CC4400), que da 4,5:1 con el texto crema.
- Web: ningún texto, color ni tamaño escrito a mano; textos con `t()`, colores y tamaños con los tokens de `theme.css`. Íconos de `lucide-react` (`menu_category.icon` guarda el nombre en kebab-case para `DynamicIcon`). Nada de `console.*` (lo bloquea el lint).
- Agregar un idioma es solo agregar la carpeta `src/shared/i18n/<idioma>/` con los mismos JSON.
- Commits convencionales en minúsculas (`feat: carta editable`), sin coautores.
