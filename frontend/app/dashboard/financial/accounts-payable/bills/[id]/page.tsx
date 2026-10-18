"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

type BillItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type BillPayment = {
  id: string;
  amount: number;
  payment?: {
    paymentNumber?: string;
    paymentDate?: string;
  };
};

type VendorBill = {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  vendor?: { name?: string };
  items?: BillItem[];
  payments?: BillPayment[];
};

export default function BillDetailPage() {
  const params = useParams<{ id: string }>();
  const [bill, setBill] = useState<VendorBill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await axios.get(`/api/financial/ap/bills/${params.id}`);
        const payload = res.data?.data ?? res.data;
        setBill(payload ?? null);
      } catch (error) {
        console.error("Failed to load bill:", error);
        setBill(null);
      } finally {
        setLoading(false);
      }
    };
    if (params?.id) {
      fetchBill();
    }
  }, [params?.id]);

  const statusClass = useMemo(() => {
    if (!bill) return "bg-gray-100 text-gray-800";
    if (Number(bill.balance) === 0) return "bg-green-100 text-green-800";
    if (bill.status === "OPEN") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  }, [bill]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading bill...</div>;
  }

  if (!bill) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/financial/accounts-payable/bills">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bills
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Bill not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/financial/accounts-payable/bills">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bills
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{bill.billNumber}</h1>
        <Badge className={statusClass}>{bill.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Vendor</div>
            <div className="font-medium">{bill.vendor?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Bill Date</div>
            <div className="font-medium">{new Date(bill.billDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Due Date</div>
            <div className="font-medium">{new Date(bill.dueDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-medium">{formatCurrency(Number(bill.totalAmount))}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Paid</div>
            <div className="font-medium">{formatCurrency(Number(bill.paidAmount))}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Balance</div>
            <div className="font-medium">{formatCurrency(Number(bill.balance))}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bill.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No items.
                  </TableCell>
                </TableRow>
              ) : (
                (bill.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(Number(item.unitPrice))}</TableCell>
                    <TableCell>{formatCurrency(Number(item.total))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
