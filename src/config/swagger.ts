import { Application } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { config } from "./environment";

function resolveOpenApiPath(): string {
  const candidates = [
    path.join(__dirname, "../swagger/openapi.yaml"),
    path.join(process.cwd(), "src/swagger/openapi.yaml"),
    path.join(process.cwd(), "dist/swagger/openapi.yaml"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("openapi.yaml not found. Expected at src/swagger/openapi.yaml");
}

export function setupSwagger(app: Application): void {
  const specPath = resolveOpenApiPath();
  const fileContents = fs.readFileSync(specPath, "utf8");
  const swaggerDocument = parseYaml(fileContents);

  const apiPrefix = config.server.apiPrefix;

  app.use(
    `${apiPrefix}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "Anchor App API Docs",
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: "list",
        filter: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      },
    })
  );

  app.get(`${apiPrefix}/docs.json`, (_req, res) => {
    res.json(swaggerDocument);
  });
}
