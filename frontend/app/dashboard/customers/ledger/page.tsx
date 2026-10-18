'use client'

import { CustomerLedgerScreen } from '@/components/sales/customer-ledger/customer-ledger-screen'

/**
 * Customers module entry point — same ledger screen as distribution sales,
 * kept at the legacy route used by Customers list/detail pages.
 */
export default function CustomerLedgerPage() {
  return (
    <CustomerLedgerScreen
      basePath="/dashboard/customers/ledger"
      pageTitle="Customer Ledger"
      pageSubtitle="Transaction history and balances for all active shops."
    />
  )
}
