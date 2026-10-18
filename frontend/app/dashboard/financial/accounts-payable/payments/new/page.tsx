"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { formatCurrency } from "@/lib/currency";

interface PaymentAllocation {
  id: string;
  billId: string;
  bill: {
    id: string;
    billNumber: string;
    vendor: {
      name: string;
    };
    totalAmount: number;
    paidAmount: number;
    balance: number;
  };
  amount: number;
}

interface Vendor {
  id: string;
  name: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [availableBills, setAvailableBills] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [unallocatedAmount, setUnallocatedAmount] = useState(0);

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get("/api/financial/ap/vendors");
        const payload = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setVendors(payload);
      } catch (error) {
        console.error("Failed to load vendors:", error);
      }
    };
    fetchVendors();
  }, []);

  // Fetch vendor bills when vendor is selected
  useEffect(() => {
    if (selectedVendorId) {
      const fetchVendorBills = async () => {
        try {
          const res = await axios.get("/api/financial/ap/bills");
          const bills = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : [];
          const vendorBills = bills.filter((bill: any) => 
            bill.vendorId === selectedVendorId && bill.balance > 0
          );
          setAvailableBills(vendorBills);
        } catch (error) {
          console.error("Failed to load vendor bills:", error);
        }
      };
      fetchVendorBills();
    } else {
      setAvailableBills([]);
      setAllocations([]);
    }
  }, [selectedVendorId]);

  // Calculate unallocated amount
  useEffect(() => {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const total = parseFloat(paymentAmount) || 0;
    setUnallocatedAmount(total - totalAllocated);
  }, [paymentAmount, allocations]);

  const addAllocation = (bill: any) => {
    const newAllocation: PaymentAllocation = {
      id: Date.now().toString(),
      billId: bill.id,
      bill: bill,
      amount: Math.min(bill.balance, unallocatedAmount)
    };
    setAllocations([...allocations, newAllocation]);
  };

  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter(alloc => alloc.id !== id));
  };

  const updateAllocation = (id: string, amount: number) => {
    setAllocations(allocations.map(alloc => 
      alloc.id === id ? { ...alloc, amount } : alloc
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        vendorId: selectedVendorId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        allocations: allocations.map(alloc => ({
          billId: alloc.billId,
          amount: alloc.amount
        }))
      };

      await axios.post("/api/financial/ap/payments", payload);
      router.push("/dashboard/financial/accounts-payable/payments");
    } catch (error) {
      console.error("Failed to create payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = selectedVendorId && paymentAmount && paymentMethod && 
                    parseFloat(paymentAmount) > 0 && 
                    Math.abs(unallocatedAmount) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/financial/accounts-payable/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Record Payment</h1>
          <p className="text-muted-foreground">
            Record a payment to a vendor and allocate it to specific bills
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            Enter the payment details and allocate to outstanding bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Unallocated Amount</Label>
                <div className={`text-lg font-semibold ${unallocatedAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(unallocatedAmount)}
                </div>
              </div>
            </div>

            {/* Available Bills */}
            {selectedVendorId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Bills</h3>
                {availableBills.length === 0 ? (
                  <div className="text-muted-foreground">
                    No outstanding bills for this vendor.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill Number</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.billNumber}</TableCell>
                          <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                          <TableCell>{formatCurrency(bill.paidAmount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(bill.balance)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addAllocation(bill)}
                              disabled={unallocatedAmount <= 0}
                            >
                              Allocate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Payment Allocations */}
            {allocations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Allocations</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill Number</TableHead>
                      <TableHead>Bill Balance</TableHead>
                      <TableHead>Allocation Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">{allocation.bill.billNumber}</TableCell>
                        <TableCell>{formatCurrency(allocation.bill.balance)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={allocation.bill.balance}
                            step="0.01"
                            value={allocation.amount}
                            onChange={(e) => updateAllocation(allocation.id, parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAllocation(allocation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-4">
              <Button type="submit" disabled={loading || !isFormValid}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Recording..." : "Record Payment"}
              </Button>
              <Link href="/dashboard/financial/accounts-payable/payments">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
