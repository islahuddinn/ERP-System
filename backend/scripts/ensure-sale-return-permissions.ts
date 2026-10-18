import { PrismaClient, UserRole } from "@prisma/tenant-client";
import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import * as crypto from "crypto";

const TARGET_EMAIL = "admin@malindtech.com";
const TARGET_CODE = "1130";

type PermissionSeed = {
  name: string;
  module: string;
  action: string;
  description: string;
  roles: UserRole[];
};

const SALE_RETURN_PERMISSIONS: PermissionSeed[] = [
  {
    name: "pos.create_return",
    module: "pos",
    action: "create_return",
    description: "Create sale returns",
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: "pos.view_returns",
    module: "pos",
    action: "view_returns",
    description: "View sale returns",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT],
  },
  {
    name: "pos.process_return",
    module: "pos",
    action: "process_return",
    description: "Approve or process sale returns",
    roles: [UserRole.ADMIN],
  },
];

class SimpleEncryption {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly tagPosition = this.saltLength + this.ivLength;
  private readonly encryptedPosition = this.tagPosition + this.tagLength;
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error("ENCRYPTION_KEY not set");
    }
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      "inventory-multi-tenant-salt",
      100000,
      this.keyLength,
      "sha512",
    );
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    try {
      const combined = Buffer.from(ciphertext, "base64");
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.tagPosition);
      const tag = combined.slice(this.tagPosition, this.encryptedPosition);
      const encrypted = combined.slice(this.encryptedPosition);
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error: any) {
      console.warn(`Failed to decrypt database_url (${error.message}); returning original value`);
      return ciphertext;
    }
  }
}

async function main() {
  console.log("==============================================");
  console.log("🔧 Ensure Sale Return Permissions & Role Assignments");
  console.log(`Target tenant: ${TARGET_EMAIL} (code ${TARGET_CODE})`);
  console.log("==============================================\n");

  const masterClient = new MasterPrismaClient();
  const encryption = new SimpleEncryption();

  try {
    const tenants = await masterClient.$queryRawUnsafe<
      Array<{ id: string; name: string; database_url: string; is_active: boolean }>
    >(`
      SELECT id, name, database_url, is_active
      FROM tenants
      WHERE (email = '${TARGET_EMAIL}' OR short_tenant_id = '${TARGET_CODE}')
        AND is_active = true
      LIMIT 1;
    `);

    if (!tenants || tenants.length === 0) {
      console.error("❌ Tenant not found or inactive.");
      process.exit(1);
    }

    const tenant = tenants[0];
    const decryptedUrl = encryption.decrypt(tenant.database_url);

    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

    const tenantPrisma = new PrismaClient({
      datasources: {
        db: { url: decryptedUrl },
      },
    });

    await tenantPrisma.$connect();
    console.log("✅ Connected to tenant database\n");

    for (const perm of SALE_RETURN_PERMISSIONS) {
      const existing = await tenantPrisma.permission.findUnique({
        where: { name: perm.name },
      });

      let permissionId = existing?.id;
      if (!permissionId) {
        const created = await tenantPrisma.permission.create({
          data: {
            name: perm.name,
            module: perm.module,
            action: perm.action,
            description: perm.description,
          },
        });
        permissionId = created.id;
        console.log(`➕ Created permission: ${perm.name}`);
      } else {
        await tenantPrisma.permission.update({
          where: { id: permissionId },
          data: {
            module: perm.module,
            action: perm.action,
            description: perm.description,
          },
        });
        console.log(`✅ Permission exists: ${perm.name}`);
      }

      for (const role of perm.roles) {
        const assignment = await tenantPrisma.rolePermission.findFirst({
          where: {
            role,
            permissionId,
          },
        });

        if (!assignment) {
          await tenantPrisma.rolePermission.create({
            data: {
              role,
              permissionId,
            },
          });
          console.log(`   ➕ Assigned ${perm.name} to ${role}`);
        } else {
          console.log(`   ✅ ${role} already has ${perm.name}`);
        }
      }
    }

    console.log("\n🔍 Verifying assignments...");
    const summary = await tenantPrisma.rolePermission.groupBy({
      by: ["role"],
      _count: true,
      where: {
        permission: {
          name: { in: SALE_RETURN_PERMISSIONS.map((p) => p.name) },
        },
      },
    });

    summary.forEach((row) => {
      console.log(`   • ${row.role}: ${row._count} sale-return permission(s)`);
    });

    await tenantPrisma.$disconnect();
    console.log("\n✅ Sale return permissions ensured successfully.");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await masterClient.$disconnect();
  }
}

main();
