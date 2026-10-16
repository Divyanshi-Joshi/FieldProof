# ── Stage 1: Build ────────────────────────────────────────────────────────────
# JDK 21 image for compiling with the Maven Wrapper.
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Copy Maven Wrapper and POM first (Docker layer caching for dependencies)
COPY .mvn/           .mvn/
COPY mvnw            mvnw
COPY pom.xml         pom.xml
COPY backend/pom.xml backend/pom.xml
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q -pl backend

# Copy backend source and package fat JAR
COPY backend/src/ backend/src/
RUN ./mvnw -q -DskipTests package -pl backend

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Slim JRE 21 image — no compiler, no Maven, no source.
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the fat JAR from the builder stage
COPY --from=builder /app/backend/target/*.jar app.jar

# Copy runtime data files that the app loads from the filesystem
# (ClaimService reads contracts/, PolicyService reads protocol/ and policy/)
COPY contracts/ contracts/
COPY protocol/  protocol/
COPY policy/    policy/

# Cloud Run injects $PORT (default 8080)
ENV PORT=8080
EXPOSE ${PORT}

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
