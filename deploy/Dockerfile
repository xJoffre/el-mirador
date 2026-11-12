FROM node:24-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
COPY api/ /src/api/
RUN npm run build

FROM eclipse-temurin:25-jdk AS backend
WORKDIR /src/backend
COPY backend/ ./
COPY --from=web /src/web/dist /src/web/dist
RUN sh mvnw -B -q package -DskipTests

FROM eclipse-temurin:25-jre
RUN useradd --system app && mkdir -p /app/photos && chown app /app/photos
USER app
ENV PHOTOS_DIR=/app/photos
COPY --from=backend /src/backend/target/el-mirador-*.jar /app/el-mirador.jar
ENTRYPOINT ["java", "-jar", "/app/el-mirador.jar"]
