# El Mirador

Pedidos en línea para El Mirador, bar-restaurante de Zaruma: la carta y el almuerzo del día en la web, una sola fila para la cocina y el panel para la encargada, los meseros y la caja.

## Alcance de la fase 1

- **Menú web**: la carta y el almuerzo del día, con lo que está disponible en este momento.
- **Panel**: carta con fotos, horario y estado del local, pedidos, caja y datos de factura para el contador.
- **Cocina**: la fila única de comandas, que se actualiza sola (SSE).

## Cómo correrlo

Requisitos: Java 25, Node 24 y PostgreSQL 18.

1. Copiar `.env.example` a `.env` y completar la base de datos.
2. Backend: `cd backend && ./mvnw spring-boot:run` (aplica las migraciones al arrancar).
3. Datos de prueba con la carta real: `psql -h localhost -U el_mirador -d el_mirador -f scripts/dev-seed/seed.sql`.
4. Web: `cd web && npm install && npm run dev` => http://localhost:5173 (las rutas `/api` van al backend).
5. Pruebas de humo: `node scripts/smoke/base.ts` y `node scripts/smoke/menu.ts` (esta última con las variables `PG*` de psql).

## Producción

En el servidor, con el `.env` completo (incluido `DOMAIN`): `docker compose -f deploy/docker-compose.yml up -d --build`. Caddy obtiene el certificado HTTPS solo.