"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_client_1 = require("@prisma/tenant-client");
const prisma = new tenant_client_1.PrismaClient();
const chartOfAccountsData = [
    {
        accountCode: "1000",
        accountName: "Cash",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1010",
        accountName: "Bank Account",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1100",
        accountName: "Accounts Receivable",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1200",
        accountName: "Inventory",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1300",
        accountName: "Raw Materials",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1310",
        accountName: "Work in Progress",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1320",
        accountName: "Finished Goods",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1400",
        accountName: "Prepaid Expenses",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1500",
        accountName: "Property, Plant & Equipment",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1510",
        accountName: "Machinery",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1520",
        accountName: "Equipment",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1530",
        accountName: "Buildings",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "1540",
        accountName: "Accumulated Depreciation",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "1600",
        accountName: "Intangible Assets",
        accountType: tenant_client_1.AccountType.ASSET,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "2000",
        accountName: "Accounts Payable",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2100",
        accountName: "Accrued Expenses",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2200",
        accountName: "Taxes Payable",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2210",
        accountName: "Sales Tax Payable",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2300",
        accountName: "Short-term Loans",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2400",
        accountName: "Long-term Liabilities",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "2410",
        accountName: "Bank Loans",
        accountType: tenant_client_1.AccountType.LIABILITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "3000",
        accountName: "Owner's Equity",
        accountType: tenant_client_1.AccountType.EQUITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "3100",
        accountName: "Share Capital",
        accountType: tenant_client_1.AccountType.EQUITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "3200",
        accountName: "Retained Earnings",
        accountType: tenant_client_1.AccountType.EQUITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "3300",
        accountName: "Current Year Earnings",
        accountType: tenant_client_1.AccountType.EQUITY,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "4000",
        accountName: "Sales Revenue",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "4100",
        accountName: "Service Revenue",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "4200",
        accountName: "Interest Income",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "4300",
        accountName: "Other Income",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.CREDIT,
    },
    {
        accountCode: "4400",
        accountName: "Sales Returns",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "4500",
        accountName: "Sales Discounts",
        accountType: tenant_client_1.AccountType.REVENUE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "5000",
        accountName: "Cost of Goods Sold",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "5100",
        accountName: "Raw Materials Cost",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "5200",
        accountName: "Direct Labor Cost",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "5300",
        accountName: "Manufacturing Overhead",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6000",
        accountName: "Salaries and Wages",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6100",
        accountName: "Rent Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6200",
        accountName: "Utilities Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6300",
        accountName: "Office Supplies",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6400",
        accountName: "Marketing Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6500",
        accountName: "Travel Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6600",
        accountName: "Insurance Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6700",
        accountName: "Professional Fees",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "6800",
        accountName: "Maintenance Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "7000",
        accountName: "Depreciation Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "7100",
        accountName: "Interest Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "7200",
        accountName: "Tax Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "7300",
        accountName: "Bad Debt Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
    {
        accountCode: "7400",
        accountName: "Miscellaneous Expense",
        accountType: tenant_client_1.AccountType.EXPENSE,
        normalBalance: tenant_client_1.NormalBalance.DEBIT,
    },
];
async function seedChartOfAccounts() {
    console.log("🌱 Seeding Chart of Accounts...");
    try {
        await prisma.chartOfAccounts.deleteMany();
        console.log("🗑️  Cleared existing Chart of Accounts");
        const result = await prisma.chartOfAccounts.createMany({
            data: chartOfAccountsData,
            skipDuplicates: true,
        });
        console.log(`✅ Successfully created ${result.count} Chart of Accounts entries`);
        const createdAccounts = await prisma.chartOfAccounts.findMany({
            orderBy: { accountCode: "asc" },
        });
        console.log("\n📋 Created Accounts:");
        createdAccounts.forEach((account) => {
            console.log(`  ${account.accountCode} - ${account.accountName} (${account.accountType})`);
        });
    }
    catch (error) {
        console.error("❌ Error seeding Chart of Accounts:", error);
        throw error;
    }
}
async function main() {
    await seedChartOfAccounts();
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-financial.js.map