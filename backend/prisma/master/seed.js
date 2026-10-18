"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const master_client_1 = require("@prisma/master-client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new master_client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting master database seed...");
    const superAdminPassword = await bcrypt.hash("superadmin123", 10);
    const superAdmin = await prisma.superAdminUser.upsert({
        where: { email: "superadmin@malindtech.com" },
        update: {},
        create: {
            name: "Super Admin",
            email: "superadmin@malindtech.com",
            password: superAdminPassword,
            role: "SUPER_ADMIN",
            isActive: true,
        },
    });
    console.log("✅ Super admin user created successfully!");
    console.log("🎉 Master database seed completed!");
    console.log("\n📋 Super Admin Credentials:");
    console.log("Email: superadmin@malindtech.com");
    console.log("Password: superadmin123");
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
}
main()
    .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map