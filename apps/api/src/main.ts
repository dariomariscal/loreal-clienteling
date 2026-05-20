import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

function parseOrigins(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth — it handles its own body parsing
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const corsOrigins = parseOrigins(process.env.CORS_ORIGINS, [
    "http://localhost:3000",
    "http://localhost:8081",
  ]);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const enableSwagger =
    process.env.ENABLE_SWAGGER === "true" ||
    process.env.NODE_ENV !== "production";

  if (enableSwagger) {
    const publicApiUrl =
      process.env.PUBLIC_API_URL ??
      process.env.BETTER_AUTH_URL ??
      `http://localhost:${process.env.PORT ?? 3001}`;
    const config = new DocumentBuilder()
      .setTitle("L'Oréal Clienteling API")
      .setDescription("API for L'Oréal beauty advisor clienteling platform")
      .setVersion("1.0")
      .addBearerAuth()
      .addServer(publicApiUrl, process.env.NODE_ENV ?? "development")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  // Bind to 0.0.0.0 so containers (Fly machines) accept external traffic.
  await app.listen(port, "0.0.0.0");
  console.log(`API running on port ${port}`);
  if (enableSwagger) {
    console.log(`Swagger docs at /api-docs`);
  }
}

bootstrap();
