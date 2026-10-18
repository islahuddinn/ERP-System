import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { subDays } from 'date-fns';
import { isDummyDataEnabled } from '@/lib/dummy-data'

const USE_DUMMY_DATA = isDummyDataEnabled()

// Dummy ledger data generator
const generateDummyLedger = (supplierId: string) => {
  const suppliers: any = {
    'sup-1': {
      supplier: {
        id: 'sup-1',
        name: 'MetalCorp Inc.',
        contactPerson: 'John Smith',
        email: 'john@metalcorp.com',
        phone: '+1 555-0123',
      },
      summary: {
        totalPurchases: 50000.00,
        totalPaid: 35000.00,
        totalReturns: 500.00,
        currentBalance: 15000.50,
        totalTransactions: 12,
        openingBalance: 500.00,
      },
      ledger: [
        {
          id: 'led-1',
          date: subDays(new Date(), 0).toISOString(),
          type: 'PURCHASE',
          reference: 'PO-2024-001',
          description: 'Steel sheets purchase',
          debit: 10000.00,
          credit: 0,
          balance: 15000.50,
        },
        {
          id: 'led-2',
          date: subDays(new Date(), 2).toISOString(),
          type: 'PAYMENT',
          reference: 'PAY-001',
          description: 'Payment received',
          debit: 0,
          credit: 5000.00,
          balance: 5000.50,
        },
        {
          id: 'led-3',
          date: subDays(new Date(), 5).toISOString(),
          type: 'PURCHASE',
          reference: 'PO-2024-002',
          description: 'Copper wire purchase',
          debit: 8000.00,
          credit: 0,
          balance: 10000.50,
        },
        {
          id: 'led-4',
          date: subDays(new Date(), 7).toISOString(),
          type: 'RETURN',
          reference: 'RET-001',
          description: 'Defective materials return',
          debit: 0,
          credit: 500.00,
          balance: 2000.50,
        },
        {
          id: 'led-5',
          date: subDays(new Date(), 10).toISOString(),
          type: 'OPENING_BALANCE',
          reference: 'OB-001',
          description: 'Opening balance',
          debit: 500.00,
          credit: 0,
          balance: 500.00,
        },
      ],
    },
    'sup-2': {
      supplier: {
        id: 'sup-2',
        name: 'ElectroParts Ltd.',
        contactPerson: 'Sarah Johnson',
        email: 'sales@electroparts.com',
        phone: '+1 555-0124',
      },
      summary: {
        totalPurchases: 25000.00,
        totalPaid: 22550.00,
        totalReturns: 0,
        currentBalance: 2450.50,
        totalTransactions: 8,
        openingBalance: 0,
      },
      ledger: [
        {
          id: 'led-6',
          date: subDays(new Date(), 1).toISOString(),
          type: 'PURCHASE',
          reference: 'PO-2024-003',
          description: 'Electronic components',
          debit: 5000.00,
          credit: 0,
          balance: 2450.50,
        },
        {
          id: 'led-7',
          date: subDays(new Date(), 3).toISOString(),
          type: 'PAYMENT',
          reference: 'PAY-002',
          description: 'Payment cleared',
          debit: 0,
          credit: 3000.00,
          balance: -2549.50,
        },
      ],
    },
    'sup-3': {
      supplier: {
        id: 'sup-3',
        name: 'Polymer Solutions',
        contactPerson: 'Mike Ross',
        email: 'mross@polysol.com',
        phone: '+1 555-0125',
      },
      summary: {
        totalPurchases: 10000.00,
        totalPaid: 10500.00,
        totalReturns: 200.00,
        currentBalance: -500.00,
        totalTransactions: 5,
        openingBalance: 0,
      },
      ledger: [
        {
          id: 'led-8',
          date: subDays(new Date(), 4).toISOString(),
          type: 'PAYMENT',
          reference: 'PAY-003',
          description: 'Overpayment',
          debit: 0,
          credit: 500.00,
          balance: -500.00,
        },
      ],
    },
  };

  return suppliers[supplierId] || null;
};

// Supplier Ledger Hooks
export const useSupplierLedger = (supplierId: string, params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['supplier-ledger', supplierId, params],
    queryFn: async () => {
      if (!supplierId) throw new Error('Supplier ID is required');

      if (USE_DUMMY_DATA) {
        const ledger = generateDummyLedger(supplierId);
        if (!ledger) throw new Error('Supplier not found');
        return ledger;
      }

      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const { data } = await apiClient.get(`/suppliers/${supplierId}/ledger?${searchParams.toString()}`);
      return data?.data || data;
    },
    enabled: !!supplierId,
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};


// --- Export helpers (QA #13) -------------------------------------------------
// NOTE: there is NO backend export endpoint (GET /suppliers/:id/ledger/export/* → 404).
// Until the backend adds one (flagged for Sir Nasir), we generate the export on the
// client from the ledger data the page already has. This makes both CSV and PDF
// actually download instead of silently failing.

const money = (v: any): string => Number(v ?? 0).toFixed(2);

const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const csvEscape = (val: any): string => {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface ExportLedgerArgs {
  ledger: any; // the object returned by useSupplierLedger (supplier + summary + entries)
  format: 'csv' | 'pdf';
}

export const useExportSupplierLedger = () => {
  return useMutation({
    mutationFn: async ({ ledger, format }: ExportLedgerArgs) => {
      if (!ledger) throw new Error('No ledger data to export');

      const supplier = ledger.supplier || {};
      // The API exposes rows under `entries`; older/dummy shapes use `ledger`.
      const rows: any[] = ledger.entries || ledger.ledger || [];
      const safeName = String(supplier.name || 'supplier').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

      if (format === 'csv') {
        const header = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'];
        const lines = [header.join(',')];
        rows.forEach((r) => {
          lines.push([
            r.date ? new Date(r.date).toLocaleDateString() : '',
            r.type ?? '',
            r.reference ?? '',
            r.description ?? '',
            money(r.debit),
            money(r.credit),
            money(r.balance),
          ].map(csvEscape).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `${safeName}-ledger.csv`);
        return;
      }

      // PDF: build a printable HTML document and open the browser print dialog
      // (Save as PDF). No extra deps required.
      const summary = ledger.summary || {};
      const rowsHtml = rows
        .map(
          (r) => `<tr>
            <td>${r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
            <td>${r.type ?? ''}</td>
            <td>${r.reference ?? ''}</td>
            <td>${r.description ?? ''}</td>
            <td style="text-align:right">${Number(r.debit ?? 0) > 0 ? money(r.debit) : '-'}</td>
            <td style="text-align:right">${Number(r.credit ?? 0) > 0 ? money(r.credit) : '-'}</td>
            <td style="text-align:right">${money(r.balance)}</td>
          </tr>`
        )
        .join('');

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${supplier.name || 'Supplier'} - Ledger</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px;}
          h1{font-size:20px;margin:0 0 4px;} .meta{color:#555;font-size:12px;margin-bottom:16px;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th,td{border:1px solid #ddd;padding:6px 8px;} th{background:#f3f4f6;text-align:left;}
          .summary{margin:12px 0;font-size:13px;}
        </style></head>
        <body>
          <h1>Supplier Ledger — ${supplier.name || ''}</h1>
          <div class="meta">${supplier.email || ''} ${supplier.phone ? ' · ' + supplier.phone : ''}</div>
          <div class="summary">
            Total Purchases: ${money(summary.totalPurchases)} &nbsp;|&nbsp;
            Total Paid: ${money(summary.totalPayments)} &nbsp;|&nbsp;
            Current Balance: ${money(ledger.currentBalance ?? summary.currentBalance)}
          </div>
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="7" style="text-align:center">No records found</td></tr>'}</tbody>
          </table>
        </body></html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Popup blocked. Please allow popups to export PDF.');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      // give the new window a tick to render before invoking print
      setTimeout(() => printWindow.print(), 250);
    },
    onSuccess: (_data, variables) => {
      toast.success(`Ledger ${variables.format.toUpperCase()} generated successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to export: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
    },
  });
};
