import "dotenv/config";
import { defineConfig } from "prisma/config";

const isMigrationCommand = process.argv.some((argument) => argument === "migrate");
const directUrl = process.env.DIRECT_URL;

function validateDirectUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("pooler")) {
      throw new Error(
        "DIRECT_URL must use the direct Neon PostgreSQL hostname, not a Neon pooler hostname."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("must use the direct Neon")) {
      throw error;
    }
    throw new Error("DIRECT_URL must be a valid PostgreSQL connection URL.");
  }

  return url;
}

if (isMigrationCommand && !directUrl) {
  throw new Error(
    "DIRECT_URL is required for Prisma migration commands. Configure it with the direct Neon PostgreSQL connection; keep DATABASE_URL for application runtime."
  );
}

const datasourceUrl = isMigrationCommand
  ? validateDirectUrl(directUrl as string)
  : directUrl || process.env.DATABASE_URL || "postgresql://localhost:5432/legacy_homes";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migration commands always use Neon’s direct connection. Generate and
    // validate can run during image builds without a production database URL.
    // The application runtime continues to use DATABASE_URL from schema.prisma.
    url: datasourceUrl,
  },
});
