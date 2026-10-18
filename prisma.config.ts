import { defineConfig } from "prisma/config";

export default defineConfig({
  datasources: {
    db: {
      url: process.env.MASTER_DATABASE_URL!,
    },
  },
});
