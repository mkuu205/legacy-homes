import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error(
    "DIRECT_URL is required for Prisma CLI commands. Configure it with the direct Neon PostgreSQL connection; keep DATABASE_URL for application runtime."
  );
}

try {
  const hostname = new URL(directUrl).hostname.toLowerCase();
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

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI migrations must use Neon’s direct connection. The application
    // runtime continues to use DATABASE_URL from schema.prisma.
    url: directUrl,
  },
});
