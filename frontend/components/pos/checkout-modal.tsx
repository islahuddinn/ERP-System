'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Plus, Minus, CreditCard, DollarSign, Smartphone, Building2, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

interface Payment {
  id: string;
  method: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  amount: number;
  referenceNumber?: string;
  cardLastFour?: string;
  cardType?: string;
  bankName?: string;
  chequeNumber?: string;
  notes?: string;
}

interface CartItem {
  id: string;
  productId?: string;
  itemType: 'PRODUCT' | 'SERVICE';
  itemName: string;
  itemDescription?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  lineSubtotal: number;
  itemTaxRate?: number;
  itemTaxAmount: number;
  itemDiscountType?: 'PERCENTAGE' | 'FIXED';
  itemDiscountRate?: number;
  itemDiscountAmount: number;
  lineTotal: number;
  notes?: string;
}

interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
}

interface SaleData {
  saleType: 'RETAIL' | 'SERVICE';
  customerId?: string;
  locationId: string;
  items: CartItem[];
  payments: Payment[];
  taxRate: number;
  discount: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    amount: number;
  };
  notes?: string;
  customerNotes?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: SaleData;
  onComplete: (saleId: string) => void;
}

export default function CheckoutModal({ isOpen, onClose, saleData, onComplete }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardType, setCardType] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculations
  const subtotal = saleData.items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const itemDiscounts = saleData.items.reduce((sum, item) => sum + item.itemDiscountAmount, 0);
  const saleDiscount = saleData.discount.amount;
  const subtotalAfterDiscount = subtotal - itemDiscounts - saleDiscount;
  const taxAmount = subtotalAfterDiscount * (saleData.taxRate / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = totalAmount - totalPaid;
  const changeGiven = totalPaid - totalAmount;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setPayments([]);
      setPaymentAmount('');
      setReferenceNumber('');
      setCardLastFour('');
      setCardType('');
      setBankName('');
      setChequeNumber('');
      setPaymentNotes('');
      setCustomerNotes('');
      setInternalNotes('');
    }
  }, [isOpen]);

  const addPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const newPayment: Payment = {
      id: `payment_${Date.now()}`,
      method: selectedPaymentMethod,
      amount,
      referenceNumber: referenceNumber || undefined,
      cardLastFour: cardLastFour || undefined,
      cardType: cardType || undefined,
      bankName: bankName || undefined,
      chequeNumber: chequeNumber || undefined,
      notes: paymentNotes || undefined,
    };

    setPayments([...payments, newPayment]);
    
    // Reset form
    setPaymentAmount('');
    setReferenceNumber('');
    setCardLastFour('');
    setCardType('');
    setBankName('');
    setChequeNumber('');
    setPaymentNotes('');
  };

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
  };

  const handleCompleteSale = async () => {
    if (remainingAmount > 0.01) {
      toast.error('Sale is not fully paid');
      return;
    }

    try {
      setIsLoading(true);
      
      const salePayload = {
        ...saleData,
        payments: payments.map(p => ({
          paymentMethod: p.method,
          amount: p.amount,
          referenceNumber: p.referenceNumber,
          cardLastFour: p.cardLastFour,
          cardType: p.cardType,
          bankName: p.bankName,
          chequeNumber: p.chequeNumber,
          notes: p.notes,
        })),
        customerNotes,
        notes: internalNotes,
      };

      const response = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Sale completed successfully!');
        onComplete(result.saleNumber);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete sale');
      }
    } catch (error) {
      toast.error('Error completing sale');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <DollarSign className="h-4 w-4" />;
      case 'CARD': return <CreditCard className="h-4 w-4" />;
      case 'MOBILE_PAYMENT': return <Smartphone className="h-4 w-4" />;
      case 'BANK_TRANSFER': return <Building2 className="h-4 w-4" />;
      case 'CHEQUE': return <FileText className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Cash';
      case 'CARD': return 'Card';
      case 'MOBILE_PAYMENT': return 'Mobile Payment';
      case 'BANK_TRANSFER': return 'Bank Transfer';
      case 'CHEQUE': return 'Cheque';
      case 'OTHER': return 'Other';
      default: return method;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "flex items-center space-x-2",
              currentStep >= 1 ? "text-blue-600" : "text-gray-400"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
              )}>
                1
              </div>
              <span>Review</span>
            </div>
            <div className="w-8 h-px bg-gray-200" />
            <div className={cn(
              "flex items-center space-x-2",
              currentStep >= 2 ? "text-blue-600" : "text-gray-400"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
              )}>
                2
              </div>
              <span>Payment</span>
            </div>
            <div className="w-8 h-px bg-gray-200" />
            <div className={cn(
              "flex items-center space-x-2",
              currentStep >= 3 ? "text-blue-600" : "text-gray-400"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200"
              )}>
                3
              </div>
              <span>Complete</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Review & Confirm */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Sale Summary</h3>
                <div className="space-y-2">
                  {saleData.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-500">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.lineTotal)}</div>
                        {item.itemDiscountAmount > 0 && (
                          <div className="text-sm text-green-600">
                            -{formatCurrency(item.itemDiscountAmount)} discount
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {itemDiscounts > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Item Discounts:</span>
                      <span>-{formatCurrency(itemDiscounts)}</span>
                    </div>
                  )}
                  {saleDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Sale Discount:</span>
                      <span>-{formatCurrency(saleDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax ({saleData.taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerNotes">Customer Notes (visible on receipt)</Label>
                  <Textarea
                    id="customerNotes"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="internalNotes">Internal Notes</Label>
                  <Textarea
                    id="internalNotes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Internal notes about this sale..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)}>
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Payment Collection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Collection</h3>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(remainingAmount)}
                    </div>
                    <div className="text-sm text-blue-600">Amount Due</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={selectedPaymentMethod} onValueChange={(value: any) => setSelectedPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    {selectedPaymentMethod === 'CARD' && (
                      <>
                        <div>
                          <Label>Last 4 Digits</Label>
                          <Input
                            value={cardLastFour}
                            onChange={(e) => setCardLastFour(e.target.value)}
                            placeholder="1234"
                            maxLength={4}
                          />
                        </div>
                        <div>
                          <Label>Card Type</Label>
                          <Input
                            value={cardType}
                            onChange={(e) => setCardType(e.target.value)}
                            placeholder="Visa, Mastercard, etc."
                          />
                        </div>
                        <div>
                          <Label>Reference Number</Label>
                          <Input
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="Auth code or transaction ID"
                          />
                        </div>
                      </>
                    )}

                    {selectedPaymentMethod === 'BANK_TRANSFER' && (
                      <>
                        <div>
                          <Label>Bank Name</Label>
                          <Input
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Bank name"
                          />
                        </div>
                        <div>
                          <Label>Reference Number</Label>
                          <Input
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="Transfer reference"
                          />
                        </div>
                      </>
                    )}

                    {selectedPaymentMethod === 'CHEQUE' && (
                      <>
                        <div>
                          <Label>Cheque Number</Label>
                          <Input
                            value={chequeNumber}
                            onChange={(e) => setChequeNumber(e.target.value)}
                            placeholder="Cheque number"
                          />
                        </div>
                        <div>
                          <Label>Bank Name</Label>
                          <Input
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Bank name"
                          />
                        </div>
                      </>
                    )}

                    {selectedPaymentMethod === 'MOBILE_PAYMENT' && (
                      <div>
                        <Label>Reference Number</Label>
                        <Input
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Mobile payment reference"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Payment notes..."
                        rows={2}
                      />
                    </div>

                    <Button onClick={addPayment} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </CardContent>
                </Card>

                {/* Payments List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payments Added</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No payments added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-2">
                              {getPaymentMethodIcon(payment.method)}
                              <div>
                                <div className="font-medium">
                                  {getPaymentMethodLabel(payment.method)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(payment.amount)}
                                  {payment.referenceNumber && ` • ${payment.referenceNumber}`}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePayment(payment.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Paid:</span>
                        <span>{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Remaining:</span>
                        <span>{formatCurrency(remainingAmount)}</span>
                      </div>
                      {changeGiven > 0 && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Change:</span>
                          <span>{formatCurrency(changeGiven)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Review
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={remainingAmount > 0.01}
                >
                  {remainingAmount > 0.01 ? `Pay ${formatCurrency(remainingAmount)} more` : 'Complete Sale'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Receipt Generation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Sale Completed!</h3>
                <p className="text-gray-600">Your sale has been processed successfully.</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold">Total Amount</div>
                  <div className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                  <div className="text-sm text-gray-500 mt-2">
                    {payments.length} payment{payments.length !== 1 ? 's' : ''} received
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => {
                    // Generate PDF receipt
                    toast.success('PDF receipt generated');
                  }}
                >
                  <FileText className="h-6 w-6" />
                  <span>Print PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => {
                    // Generate thermal receipt
                    toast.success('Thermal receipt generated');
                  }}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Print Thermal</span>
                </Button>
              </div>

              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={onClose}>
                  New Sale
                </Button>
                <Button onClick={handleCompleteSale} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Finish'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
