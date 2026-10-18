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

type PaymentAllocation = {
  billId: string;
  amount: number;
  bill?: {
    billNumber?: string;
    dueDate?: string;
  };
};

type VendorPayment = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  method: string;
  amount: number;
  vendor?: {
    name?: string;
  };
  allocations?: PaymentAllocation[];
};

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<VendorPayment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await axios.get(`/api/financial/ap/payments/${params.id}`);
        const payload = res.data?.data ?? res.data;
        setPayment(payload ?? null);
      } catch (error) {
        console.error("Failed to load payment:", error);
        setPayment(null);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchPayment();
    }
  }, [params?.id]);

  const methodClass = useMemo(() => {
    if (!payment) return "bg-gray-100 text-gray-800";
    if (payment.method === "BANK") return "bg-blue-100 text-blue-800";
    if (payment.method === "CASH") return "bg-green-100 text-green-800";
    if (payment.method === "CHECK") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  }, [payment]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading payment...</div>;
  }

  if (!payment) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/financial/accounts-payable/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Payment not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/financial/accounts-payable/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{payment.paymentNumber}</h1>
        <Badge className={methodClass}>{payment.method}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Vendor</div>
            <div className="font-medium">{payment.vendor?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Payment Date</div>
            <div className="font-medium">
              {new Date(payment.paymentDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Amount</div>
            <div className="font-medium">{formatCurrency(Number(payment.amount))}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Allocated Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payment.allocations ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No allocations.
                  </TableCell>
                </TableRow>
              ) : (
                (payment.allocations ?? []).map((allocation, index) => (
                  <TableRow key={`${allocation.billId}-${index}`}>
                    <TableCell>{allocation.bill?.billNumber ?? allocation.billId}</TableCell>
                    <TableCell>
                      {allocation.bill?.dueDate
                        ? new Date(allocation.bill.dueDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(allocation.amount))}
                    </TableCell>
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
