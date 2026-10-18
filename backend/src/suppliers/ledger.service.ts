import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { LedgerQueryDto } from "./dto/ledger-query.dto";

@Injectable()
export class SupplierLedgerService {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async getSupplierLedger(supplierId: string, queryDto: LedgerQueryDto) {
    const { startDate, endDate } = queryDto;

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        openingBalanceAmount: true,
        openingBalanceDate: true,
        openingBalanceNote: true,
        createdAt: true,
      },
    });

    if (!supplier) throw new NotFoundException("Supplier not found");

    // Inclusive, end-of-day range so transactions on the end date are included (QA #7).
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

    // Whether a given date falls inside the selected range. Used for the opening
    // balance and nested PO payments, which the Prisma queries below don't filter.
    const inRange = (d: Date | null | undefined): boolean => {
      if (!d) return false;
      const t = new Date(d).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      return true;
    };

    const dateFilter = start || end ? { gte: start, lte: end } : undefined;

    const [purchaseOrders, purchaseReturns, manualTransactions] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: {
          supplierId,
          status: { notIn: ["DRAFT", "CANCELLED"] },
          ...(dateFilter ? { orderDate: dateFilter } : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          totalAmount: true,
          status: true,
          payments: {
            select: { id: true, amount: true, paymentDate: true, paymentMethod: true, referenceNumber: true },
          },
        },
        orderBy: { orderDate: "asc" },
      }),
      this.prisma.purchaseReturn.findMany({
        where: {
          purchaseOrder: { supplierId },
          ...(dateFilter ? { returnDate: dateFilter } : {}),
        },
        select: { id: true, returnNumber: true, returnDate: true, totalAmount: true, reason: true },
        orderBy: { returnDate: "asc" },
      }),
      this.prisma.supplierTransaction.findMany({
        where: { supplierId, ...(dateFilter ? { date: dateFilter } : {}) },
        select: {
          id: true,
          date: true,
          type: true,
          reference: true,
          description: true,
          debit: true,
          credit: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build chronological ledger entries
    const entries: LedgerEntry[] = [];

    // Opening balance entry — included only when it falls within the selected
    // date range, so an out-of-range opening balance doesn't leak into the
    // filtered ledger rows or the summary cards (QA #7).
    const openingAmount = Number(supplier.openingBalanceAmount ?? 0);
    const openingDate = supplier.openingBalanceDate ?? supplier.createdAt;
    const includeOpening = openingAmount !== 0 && inRange(openingDate);
    if (includeOpening) {
      entries.push({
        date: openingDate,
        type: "OPENING_BALANCE",
        reference: "Opening Balance",
        description: supplier.openingBalanceNote ?? "Opening balance",
        debit: openingAmount < 0 ? Math.abs(openingAmount) : 0,
        credit: openingAmount > 0 ? openingAmount : 0,
        sourceId: null,
      });
    }

    // Purchase orders: each PO increases what factory owes (credit)
    for (const po of purchaseOrders) {
      entries.push({
        date: po.orderDate,
        type: "PURCHASE_ORDER",
        reference: po.orderNumber,
        description: `Purchase order ${po.orderNumber}`,
        debit: 0,
        credit: Number(po.totalAmount),
        sourceId: po.id,
      });

      // Payments against this PO: factory paid (debit). A PO can be in range
      // while an individual payment isn't, so filter each by its own date (QA #7).
      for (const payment of po.payments) {
        if (!inRange(payment.paymentDate)) continue;
        entries.push({
          date: payment.paymentDate,
          type: "PAYMENT",
          reference: payment.referenceNumber ?? null,
          description: `Payment for PO ${po.orderNumber} via ${payment.paymentMethod}`,
          debit: Number(payment.amount),
          credit: 0,
          sourceId: payment.id,
        });
      }
    }

    // Purchase returns: reduces what factory owes (debit)
    for (const ret of purchaseReturns) {
      entries.push({
        date: ret.returnDate,
        type: "PURCHASE_RETURN",
        reference: ret.returnNumber,
        description: `Return ${ret.returnNumber} — ${ret.reason}`,
        debit: Number(ret.totalAmount),
        credit: 0,
        sourceId: ret.id,
      });
    }

    // Manual transactions
    for (const tx of manualTransactions) {
      entries.push({
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        debit: Number(tx.debit),
        credit: Number(tx.credit),
        sourceId: tx.id,
      });
    }

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Add running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, balance: runningBalance };
    });

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
      },
      openingBalance: includeOpening ? openingAmount : 0,
      currentBalance: runningBalance,
      summary: {
        // Summary cards must reflect BOTH system records (POs/payments/returns) and
        // manually-added ledger transactions of the matching type, otherwise a manual
        // PURCHASE/PAYMENT/RETURN shows in the table but the card stays at 0 (QA #11).
        // A manual tx keeps its amount on one side (credit for PURCHASE, debit for
        // PAYMENT/RETURN), so debit+credit is its magnitude regardless of side.
        totalPurchases:
          purchaseOrders.reduce((s, po) => s + Number(po.totalAmount), 0) +
          manualTransactions
            .filter((tx) => tx.type === "PURCHASE")
            .reduce((s, tx) => s + Number(tx.debit) + Number(tx.credit), 0),
        totalPayments:
          purchaseOrders.reduce(
            (s, po) => s + po.payments.filter((p) => inRange(p.paymentDate)).reduce((ps, p) => ps + Number(p.amount), 0),
            0,
          ) +
          manualTransactions
            .filter((tx) => tx.type === "PAYMENT")
            .reduce((s, tx) => s + Number(tx.debit) + Number(tx.credit), 0),
        totalReturns:
          purchaseReturns.reduce((s, r) => s + Number(r.totalAmount), 0) +
          manualTransactions
            .filter((tx) => tx.type === "RETURN")
            .reduce((s, tx) => s + Number(tx.debit) + Number(tx.credit), 0),
        manualDebits: manualTransactions.reduce((s, tx) => s + Number(tx.debit), 0),
        manualCredits: manualTransactions.reduce((s, tx) => s + Number(tx.credit), 0),
      },
      entries: entriesWithBalance,
    };
  }

  async getLedgerOverview(search?: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        openingBalanceAmount: true,
        openingBalanceDate: true,
        purchaseOrders: {
          where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
          select: {
            orderDate: true,
            totalAmount: true,
            payments: { select: { amount: true, paymentDate: true } },
            returns: {
              where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
              select: { totalAmount: true, returnDate: true },
            },
          },
        },
        manualTransactions: { select: { date: true, type: true, debit: true, credit: true } },
      },
      orderBy: { name: "asc" },
    });

    return suppliers.map((s) => {
      const openingBalance = Number(s.openingBalanceAmount ?? 0);
      // Fold manual transactions into the matching bucket by type so the overview
      // cards match the detail view and the ledger table (QA #11). A manual tx holds
      // its amount on one side, so debit+credit is its magnitude regardless of side.
      const manualByType = (type: string) =>
        s.manualTransactions
          .filter((tx) => tx.type === type)
          .reduce((sum, tx) => sum + Number(tx.debit) + Number(tx.credit), 0);
      // PO-only subtotals drive the balance (manual amounts are added to the balance
      // once, via manualCredits/manualDebits below — keeping them out here avoids
      // double-counting). The *display* totals then layer manual-by-type on top.
      const poPurchases = s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      const poPayments = s.purchaseOrders.reduce(
        (sum, po) => sum + po.payments.reduce((ps, p) => ps + Number(p.amount), 0),
        0,
      );
      const poReturns = s.purchaseOrders.flatMap((po) => po.returns).reduce((sum, r) => sum + Number(r.totalAmount), 0);
      const totalPurchases = poPurchases + manualByType("PURCHASE");
      const totalPayments = poPayments + manualByType("PAYMENT");
      const totalReturns = poReturns + manualByType("RETURN");
      const manualDebits = s.manualTransactions.reduce((sum, tx) => sum + Number(tx.debit), 0);
      const manualCredits = s.manualTransactions.reduce((sum, tx) => sum + Number(tx.credit), 0);

      // balance > 0 = factory owes supplier | balance < 0 = supplier has credit to factory
      const balance =
        openingBalance + poPurchases - poPayments - poReturns + manualCredits - manualDebits;

      const lastPaymentDate = s.purchaseOrders
        .flatMap((po) => po.payments.map((p) => p.paymentDate))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      // Transaction count + most-recent activity date so the overview cards show
      // real transaction data instead of blanks (QA #11).
      const paymentCount = s.purchaseOrders.reduce((c, po) => c + po.payments.length, 0);
      const returnCount = s.purchaseOrders.reduce((c, po) => c + po.returns.length, 0);
      const transactionCount =
        (openingBalance !== 0 ? 1 : 0) +
        s.purchaseOrders.length +
        paymentCount +
        returnCount +
        s.manualTransactions.length;

      const activityDates: Date[] = [
        ...s.purchaseOrders.map((po) => po.orderDate),
        ...s.purchaseOrders.flatMap((po) => po.payments.map((p) => p.paymentDate)),
        ...s.purchaseOrders.flatMap((po) => po.returns.map((r) => r.returnDate)),
        ...s.manualTransactions.map((tx) => tx.date),
      ].filter((d): d is Date => Boolean(d));
      const lastTransactionDate = activityDates.length
        ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
        : null;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        openingBalance,
        balance,
        totalPurchases,
        totalPayments,
        totalReturns,
        transactionCount,
        lastTransactionDate,
        lastPaymentDate,
      };
    });
  }
}

interface LedgerEntry {
  date: Date;
  type: string;
  reference: string | null;
  description: string;
  debit: number;
  credit: number;
  sourceId: string | null;
}
