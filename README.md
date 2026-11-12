# El Mirador

Pedidos en línea para El Mirador, bar-restaurante de Zaruma: la carta y el almuerzo del día en la web, una sola fila para la cocina y el panel para la encargada, los meseros y la caja.

## Alcance de la fase 1

- **Menú web**: la carta y el almuerzo del día, con lo que está disponible en este momento.
- **Panel**: cada persona entra con su nombre y PIN y ve lo que su rol permite; carta con fotos, horario y estado del local, usuarios, agotados del día, pedidos, caja y datos de factura para el contador.
- **Cocina**: la fila única de comandas, que se actualiza sola (SSE), suena al llegar una nueva y deja la pantalla de la tablet siempre encendida.
- **Seguimiento**: el cliente ve su pedido pasar de recibido a listo sin recargar la página.
- **Instalable**: el sitio y el panel se instalan como app en el celular o la tablet. El aviso de privacidad está en `/privacidad`.

## Cómo correrlo

Requisitos: Java 25, Node 24 y PostgreSQL 18.

1. Copiar `.env.example` a `.env` y completar la base de datos.
2. Backend: `cd backend && ./mvnw spring-boot:run` (aplica las migraciones al arrancar).
3. Datos de prueba con la carta real: `psql -h localhost -U el_mirador -d el_mirador -f scripts/dev-seed/seed.sql` (equipo de prueba: Encargada `123456`, Mesero `222222`, Cocina `333333`).
4. Web: `cd web && npm install && npm run dev` => http://localhost:5173 (las rutas `/api` van al backend).
5. Pruebas de humo: `node scripts/smoke/<nombre>.ts` (las que tocan la base usan las variables `PG*` de psql) y de punta a punta: `cd web && npm run e2e`.

## Producción

En el servidor, con el `.env` completo (incluidos `DOMAIN` y la primera encargada en `FIRST_ADMIN_NAME` y `FIRST_ADMIN_PIN`): `docker compose -f deploy/docker-compose.yml up -d --build`. Caddy obtiene el certificado HTTPS solo.

- **Respaldo**: el servicio `backup` guarda la base todos los días a las `BACKUP_AT` (hora UTC: `08:00` => 03:00 en Zaruma) y conserva `BACKUP_KEEP_DAYS` días. Con `BACKUP_REMOTE` (un remoto de rclone, configurado con variables `RCLONE_CONFIG_*` en el mismo `.env`) copia la base y las fotos fuera del servidor.
- **Prueba de restauración**: `docker compose -f deploy/docker-compose.yml exec backup backup check` restaura el último respaldo en una base aparte y compara tabla por tabla (la CI lo hace en cada cambio). Para volver de verdad a un respaldo: detener `app` y correr `backup restore /backups/<archivo>.dump` en el mismo contenedor.
- **Alertas**: `BACKUP_PING_URL` (un chequeo de healthchecks.io) avisa si un respaldo falla o no se hizo. Para saber si el sitio se cae, un monitor externo (UptimeRobot, gratis) sobre `https://<dominio>/actuator/health`.
- **Simulacro de hora punta**: `node scripts/rush.ts https://<dominio> 30 15 staff` manda 30 pedidos en 15 minutos para que la cocina y la caja los atiendan de verdad. Con `robot-kitchen` (solo en pruebas) también los cocina y cobra.
- **Equipo**: la guía para la capacitación y el texto de la respuesta automática de WhatsApp Business están en `docs/guia-del-equipo.md`.