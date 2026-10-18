import { PrismaClient, AccountType, NormalBalance } from "@prisma/tenant-client";

const prisma = new PrismaClient();

const chartOfAccountsData = [
  // Assets
  {
    accountCode: "1000",
    accountName: "Cash",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1010",
    accountName: "Bank Account",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1100",
    accountName: "Accounts Receivable",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1200",
    accountName: "Inventory",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1300",
    accountName: "Raw Materials",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1310",
    accountName: "Work in Progress",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1320",
    accountName: "Finished Goods",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1400",
    accountName: "Prepaid Expenses",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1500",
    accountName: "Property, Plant & Equipment",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1510",
    accountName: "Machinery",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1520",
    accountName: "Equipment",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1530",
    accountName: "Buildings",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "1540",
    accountName: "Accumulated Depreciation",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "1600",
    accountName: "Intangible Assets",
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  },

  // Liabilities
  {
    accountCode: "2000",
    accountName: "Accounts Payable",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2100",
    accountName: "Accrued Expenses",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2200",
    accountName: "Taxes Payable",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2210",
    accountName: "Sales Tax Payable",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2300",
    accountName: "Short-term Loans",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2400",
    accountName: "Long-term Liabilities",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "2410",
    accountName: "Bank Loans",
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  },

  // Equity
  {
    accountCode: "3000",
    accountName: "Owner's Equity",
    accountType: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "3100",
    accountName: "Share Capital",
    accountType: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "3200",
    accountName: "Retained Earnings",
    accountType: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "3300",
    accountName: "Current Year Earnings",
    accountType: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
  },

  // Revenue
  {
    accountCode: "4000",
    accountName: "Sales Revenue",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "4100",
    accountName: "Service Revenue",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "4200",
    accountName: "Interest Income",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "4300",
    accountName: "Other Income",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
  },
  {
    accountCode: "4400",
    accountName: "Sales Returns",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "4500",
    accountName: "Sales Discounts",
    accountType: AccountType.REVENUE,
    normalBalance: NormalBalance.DEBIT,
  },

  // Cost of Goods Sold
  {
    accountCode: "5000",
    accountName: "Cost of Goods Sold",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "5100",
    accountName: "Raw Materials Cost",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "5200",
    accountName: "Direct Labor Cost",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "5300",
    accountName: "Manufacturing Overhead",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },

  // Operating Expenses
  {
    accountCode: "6000",
    accountName: "Salaries and Wages",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6100",
    accountName: "Rent Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6200",
    accountName: "Utilities Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6300",
    accountName: "Office Supplies",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6400",
    accountName: "Marketing Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6500",
    accountName: "Travel Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6600",
    accountName: "Insurance Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6700",
    accountName: "Professional Fees",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "6800",
    accountName: "Maintenance Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },

  // Other Expenses
  {
    accountCode: "7000",
    accountName: "Depreciation Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "7100",
    accountName: "Interest Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "7200",
    accountName: "Tax Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "7300",
    accountName: "Bad Debt Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
  {
    accountCode: "7400",
    accountName: "Miscellaneous Expense",
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  },
];

async function seedChartOfAccounts() {
  console.log("🌱 Seeding Chart of Accounts...");

  try {
    // Clear existing accounts
    await prisma.chartOfAccounts.deleteMany();
    console.log("🗑️  Cleared existing Chart of Accounts");

    // Insert new accounts
    const result = await prisma.chartOfAccounts.createMany({
      data: chartOfAccountsData,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully created ${result.count} Chart of Accounts entries`);

    // Log created accounts
    const createdAccounts = await prisma.chartOfAccounts.findMany({
      orderBy: { accountCode: "asc" },
    });

    console.log("\n📋 Created Accounts:");
    createdAccounts.forEach((account) => {
      console.log(`  ${account.accountCode} - ${account.accountName} (${account.accountType})`);
    });
  } catch (error) {
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
