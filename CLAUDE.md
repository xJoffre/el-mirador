# El Mirador: guía interna

Sistema de pedidos del bar-restaurante El Mirador (Zaruma, Ecuador). La arquitectura y el plan por semanas están en `El-Mirador-arquitectura.html` (carpeta compartida de cconnect); el código y las migraciones mandan sobre ese documento.

## Estructura

- `backend/`: Spring Boot 4 con Maven, Java 25, paquete `ec.elmirador`. Un paquete por módulo (`menu`, `schedule`, `orders`, `invoicing`, `staff`) con `api/` (rutas), `domain/` (servicios y puertos) e `infra/` (repositorios SQL). `shared/` guarda solo mecanismos: configuración (`AppProperties`), reloj en la zona del local (`Clock`), errores (`ApiException`) y el canal SSE (`EventStream`).
- `web/`: React + Vite + TypeScript. `src/app/` (rutas y proveedores), `src/shared/api/` (generado por orval, no se edita), `src/shared/ui/` (shadcn/ui), `src/shared/theme/theme.css` (los únicos colores, fuentes y radios), `src/shared/i18n/<idioma>/<espacio>.json` (textos), `src/features/<funcionalidad>/`.
- `api/openapi.json`: el contrato exportado por el backend. Su diff es la revisión de cada cambio de la API.
- `scripts/smoke/`: pruebas de humo contra el sistema real (`node scripts/smoke/base.ts <url>`).
- `deploy/`: `Dockerfile`, `docker-compose.yml` (PostgreSQL, app, Caddy) y `Caddyfile`.

## Configuración

Un solo archivo: `.env` en la raíz (plantilla en `.env.example`, el real nunca se sube). Lo leen Spring (`spring.config.import`) y Docker Compose (`env_file`). En el código, la configuración propia se pide a `AppProperties`; nadie lee variables de entorno directamente.

## Ciclo del contrato

Con el backend corriendo: `cd web && npm run api` (exporta `api/openapi.json` y regenera el cliente y los esquemas zod), y luego `npm run build` (chequeo de tipos). Los tres pasos van en el mismo commit. La integración continua falla si el contrato regenerado difiere del que está en el repo.

## Reglas

- Sin comentarios en el código. La documentación vive como datos: `COMMENT` en inglés en cada tabla y columna, y las etiquetas en los JSON de i18n.
- Las migraciones Liquibase van en `backend/src/main/resources/db/changelog/changes/`, cada una con su rollback. La CI las aplica, las deshace y las vuelve a aplicar.
- Los valores derivados (precios vendidos, totales, estado actual) los calcula la base con triggers; la lista de triggers está en la sección 6 de la arquitectura y se mantiene al día.
- Los repositorios usan `JdbcClient` con SQL escrito a mano; son el único lugar con SQL. Los servicios reciben un puerto y las pruebas unitarias les pasan un doble en memoria.
- Los errores de negocio son `new ApiException(status, "modulo.clave")`: el estado HTTP real y una clave i18n en `code` que la web traduce.
- Los módulos no se importan entre sí: se hablan por contratos publicados y eventos. Los avisos al navegador salen por `EventStream.publish(nombre, datos)`.
- Las horas se guardan como `timestamptz`; "hoy" se calcula con el `Clock` inyectado (America/Guayaquil), y la sesión de PostgreSQL usa la misma zona.
- Web: ningún texto, color ni tamaño escrito a mano; textos con `t()`, colores y tamaños con los tokens de `theme.css`. Íconos de `lucide-react`. Nada de `console.*` (lo bloquea el lint).
- Agregar un idioma es solo agregar la carpeta `src/shared/i18n/<idioma>/` con los mismos JSON.
- Commits convencionales en minúsculas (`feat: carta editable`), sin coautores.
