import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/master-client";

@Injectable()
export class MasterPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MasterPrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(`✅ Connected to master database`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to connect to master database`);
      this.logger.error(error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // constructor() {
  //   // For master client, we need to temporarily set DATABASE_URL to MASTER_DATABASE_URL
  //   const originalDatabaseUrl = process.env.DATABASE_URL;
  //   if (process.env.MASTER_DATABASE_URL) {
  //     process.env.DATABASE_URL = process.env.MASTER_DATABASE_URL;
  //   }
  //   // ✅ IMPORTANT: call super() with NO arguments (Prisma v7.4.1 requirement)
  //   // Prisma will read DATABASE_URL from environment variable
  //   super();
  //   // Restore original DATABASE_URL immediately after client creation
  //   if (originalDatabaseUrl !== undefined) {
  //     process.env.DATABASE_URL = originalDatabaseUrl;
  //   } else {
  //     delete process.env.DATABASE_URL;
  //   }
  // }

  // async onModuleInit() {
  //   try {
  //     await this.$connect();
  //     this.logger.log("✅ Successfully connected to master database");
  //   } catch (error: any) {
  //     const dbUrl = process.env.MASTER_DATABASE_URL;
  //     let dbHost = "unknown";

  //     try {
  //       if (dbUrl) {
  //         const url = new URL(dbUrl);
  //         dbHost = url.hostname;
  //       }
  //     } catch {
  //       // If URL parsing fails, just use the raw value (masked)
  //       dbHost = dbUrl ? `${dbUrl.substring(0, 20)}...` : "not set";
  //     }

  //     this.logger.error(`❌ Failed to connect to master database at ${dbHost}`);
  //     this.logger.error(`Error: ${error.message}`);
  //     this.logger.error(
  //       "\n📋 To fix this issue:\n" +
  //         "1. Check if your database server is running\n" +
  //         "2. Verify MASTER_DATABASE_URL in your .env file\n" +
  //         "3. For local development, use: postgresql://postgres:password@localhost:5432/inventory_master?schema=public\n" +
  //         "4. Ensure the database exists and migrations have been run (npm run master:migrate)\n" +
  //         "5. Check network connectivity if using a remote database (Railway, etc.)\n" +
  //         "6. If using Railway, ensure the database service is not paused\n",
  //     );

  //     // Re-throw to prevent app from starting with broken database connection
  //     throw error;
  //   }
  // }

  // async onModuleDestroy() {
  //   await this.$disconnect();
  // }
}
