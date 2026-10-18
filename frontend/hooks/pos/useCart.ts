import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export interface CartItem {
  id: string;
  productId?: string;
  itemType: 'PRODUCT' | 'SERVICE';
  itemName: string;
  itemDescription?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  itemTaxAmount: number;
  itemDiscountAmount: number;
  lineTotal: number;
  originalItemDiscountType?: 'PERCENTAGE' | 'FIXED'; // For preserving original discount type when editing
}

export interface Discount {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  amount: number;
}

export const useCart = (initialTaxRate: number = 0) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<Discount>({ type: 'PERCENTAGE', value: 0, amount: 0 });
  const [taxRate, setTaxRate] = useState<number>(initialTaxRate);

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.lineSubtotal || 0), 0);
  const itemDiscounts = cartItems.reduce((sum, item) => sum + (item.itemDiscountAmount || 0), 0);
  const saleDiscount = discount.amount || 0;
  const subtotalAfterDiscount = subtotal - itemDiscounts - saleDiscount;
  const taxAmount = subtotalAfterDiscount * ((taxRate || 0) / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;

  const addToCart = (product: any, getProductStockQuantity: (product: any) => number) => {
    // Check if product can be added
    if (!product || !getProductStockQuantity) {
      toast.error('Product information is missing');
      return;
    }

    const stockQuantity = getProductStockQuantity(product);
    const isActive = product.isActive !== undefined ? product.isActive : true;
    
    if (!isActive || stockQuantity <= 0) {
      toast.error('Cannot add product: Out of stock or inactive');
      return;
    }

    const existingItem = cartItems.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity + 1 > stockQuantity) {
        toast.error('Insufficient stock available');
        return;
      }
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        id: `item_${Date.now()}`,
        productId: product.id,
        itemType: 'PRODUCT',
        itemName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: Number(product.sellingPrice || 0),
        lineSubtotal: Number(product.sellingPrice || 0),
        itemTaxAmount: Number(product.sellingPrice || 0) * (taxRate / 100),
        itemDiscountAmount: 0,
        lineTotal: Number(product.sellingPrice || 0) + (Number(product.sellingPrice || 0) * (taxRate / 100)) - 0
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  // Helper function to recalculate item totals
  const recalculateItemTotals = (item: CartItem): CartItem => {
    const updatedItem = { ...item };
    updatedItem.lineSubtotal = updatedItem.unitPrice * updatedItem.quantity;
    updatedItem.itemTaxAmount = (updatedItem.lineSubtotal - updatedItem.itemDiscountAmount) * (taxRate / 100);
    updatedItem.lineTotal = updatedItem.lineSubtotal - updatedItem.itemDiscountAmount + updatedItem.itemTaxAmount;
    return updatedItem;
  };

  const updateQuantity = (itemId: string, newQuantity: number, getProductStockQuantity?: (product: any) => number, products?: any[]) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    // Find the cart item
    const cartItem = cartItems.find(item => item.id === itemId);
    if (!cartItem) return;
    
    // If it's a product (not a service), validate against stock
    if (cartItem.itemType === 'PRODUCT' && cartItem.productId && getProductStockQuantity && products) {
      const product = products.find(p => p.id === cartItem.productId);
      if (product) {
        const availableStock = getProductStockQuantity(product);
        if (newQuantity > availableStock) {
          toast.error(`Insufficient stock. Current: ${availableStock}, Requested: ${newQuantity}`);
          return;
        }
      }
    }
    
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, quantity: newQuantity };
        return recalculateItemTotals(updatedItem);
      }
      return item;
    }));
  };

  const updateUnitPrice = (itemId: string, newUnitPrice: number) => {
    if (newUnitPrice < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }
    
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, unitPrice: newUnitPrice };
        return recalculateItemTotals(updatedItem);
      }
      return item;
    }));
  };

  const updateItemDiscount = (itemId: string, discountAmount: number) => {
    const cartItem = cartItems.find(item => item.id === itemId);
    if (!cartItem) return;
    
    // Discount cannot be negative or greater than line subtotal
    const maxDiscount = cartItem.lineSubtotal;
    const finalDiscount = Math.max(0, Math.min(discountAmount, maxDiscount));
    
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, itemDiscountAmount: finalDiscount };
        return recalculateItemTotals(updatedItem);
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount({ type: 'PERCENTAGE', value: 0, amount: 0 });
  };

  const addServiceToCart = (serviceData: {
    name: string;
    quantity: number;
    unitPrice: number;
  }) => {
    const newItem: CartItem = {
      id: `service_${Date.now()}`,
      itemType: 'SERVICE',
      itemName: serviceData.name,
      quantity: serviceData.quantity,
      unitPrice: serviceData.unitPrice,
      lineSubtotal: serviceData.unitPrice * serviceData.quantity,
      itemTaxAmount: (serviceData.unitPrice * serviceData.quantity) * (taxRate / 100),
      itemDiscountAmount: 0,
      lineTotal: (serviceData.unitPrice * serviceData.quantity) + ((serviceData.unitPrice * serviceData.quantity) * (taxRate / 100)) - 0
    };
    setCartItems(prev => [...prev, newItem]);
  };

  // Update discount amount when discount value changes
  useEffect(() => {
    const newAmount = discount.type === 'PERCENTAGE' 
      ? (subtotal * discount.value / 100) 
      : discount.value;
    setDiscount(prev => ({ ...prev, amount: newAmount }));
  }, [discount.value, discount.type, subtotal]);

  // Recalculate cart item tax amounts when tax rate changes
  useEffect(() => {
    setCartItems(prev => {
      if (prev.length === 0) return prev;
      return prev.map(item => {
        const updatedItem = { ...item };
        updatedItem.lineSubtotal = updatedItem.unitPrice * updatedItem.quantity;
        updatedItem.itemTaxAmount = (updatedItem.lineSubtotal - updatedItem.itemDiscountAmount) * (taxRate / 100);
        updatedItem.lineTotal = updatedItem.lineSubtotal - updatedItem.itemDiscountAmount + updatedItem.itemTaxAmount;
        return updatedItem;
      });
    });
  }, [taxRate]);

  return {
    cartItems,
    discount,
    setDiscount,
    subtotal,
    itemDiscounts,
    saleDiscount,
    subtotalAfterDiscount,
    taxAmount,
    taxRate,
    setTaxRate,
    totalAmount,
    addToCart,
    updateQuantity,
    updateUnitPrice,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    addServiceToCart,
    setCartItems
  };
};

