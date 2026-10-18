'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Package,
  MapPin,
  BarChart3,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
  Truck,
  ChevronDown,
  ChevronRight,
  Tag,
  Tags,
  Ruler,
  Trash2,
  Plus,
  Menu,
  X,
  CreditCard,
  ShoppingCart,
  Receipt,
  Users,
  UserCog,
  RotateCcw,
  LayoutDashboard,
  PackageSearch,
  History,
  Wallet,
  Warehouse,
  Shield,
  Factory,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  Activity,
  Calendar,
  Clock,
  Archive,
  Ban,
  Briefcase,
  DollarSign,
  BookOpen,
  FlaskConical,
  Boxes,
  UserCheck,
  Gift,
  BadgePercent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { useBranding } from '@/hooks/useBranding'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { canViewNavHref } from '@/lib/nav-permissions'

// Organized navigation with sections
const navigationSections = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: BarChart3, hasSubmenu: false },
      { name: 'Distribution Management Dashboard', shortName: 'DMD', href: '/dashboard/factory', icon: Factory, hasSubmenu: false },
    ]
  },
  {
    name: 'Master Data',
    items: [
      {
        name: 'Products',
        href: '/dashboard/products',
        icon: Package,
        hasSubmenu: true,
        submenu: [
          { name: 'Products', href: '/dashboard/products', icon: Package },
          { name: 'Add Product', href: '/dashboard/products/add', icon: Plus },
          { name: 'UOMs', href: '/dashboard/products/uoms', icon: Ruler },
        ]
      },
      {
        name: 'Raw Materials',
        href: '/dashboard/raw-materials',
        icon: FlaskConical,
        hasSubmenu: true,
        submenu: [
          { name: 'All Raw Materials', href: '/dashboard/raw-materials', icon: FlaskConical },
          { name: 'Add Raw Material', href: '/dashboard/raw-materials/add', icon: Plus },
          { name: 'Batches', href: '/dashboard/raw-materials/batches', icon: Package },
        ]
      },
      {
        name: 'Locations',
        href: '/dashboard/locations',
        icon: MapPin,
        hasSubmenu: false,
        badge: undefined,
      },
      {
        name: 'Sites',
        href: '/dashboard/sites',
        icon: MapPin,
        hasSubmenu: true,
        submenu: [
          { name: 'All Sites', href: '/dashboard/sites', icon: MapPin },
          { name: 'Add Site', href: '/dashboard/sites/create', icon: Plus },
          { name: 'Warehouses', href: '/dashboard/sites?type=WAREHOUSE', icon: Warehouse },
          { name: 'Zones', href: '/dashboard/sites?type=ZONE', icon: MapPin },
        ]
      },
      {
        name: 'Suppliers',
        href: '/dashboard/suppliers',
        icon: Truck,
        hasSubmenu: true,
        submenu: [
          { name: 'Supplier List', href: '/dashboard/suppliers', icon: Truck },
          { name: 'Add Supplier', href: '/dashboard/suppliers/create', icon: Plus },
          { name: 'Supplier Ledger', href: '/dashboard/suppliers/ledger', icon: FileText },
        ]
      },
    ]
  },
  {
    name: 'Warehouse Management',
    items: [
      {
        name: 'Warehouses',
        href: '/dashboard/factory/warehouses',
        icon: Warehouse,
        hasSubmenu: true,
        submenu: [
          { name: 'All Warehouses', href: '/dashboard/factory/warehouses', icon: Warehouse },
          { name: 'Storage Warehouses', href: '/dashboard/factory/warehouses?type=STORAGE', icon: Package },
          { name: 'Dispatch Warehouses', href: '/dashboard/factory/warehouses?type=DISPATCH', icon: TrendingUp },
        ]
      },
      {
        name: 'Zones',
        href: '/dashboard/factory/zones',
        icon: MapPin,
        hasSubmenu: false,
      },
      {
        name: 'Warehouse Stock',
        href: '/dashboard/warehouse-stock',
        icon: Warehouse,
        hasSubmenu: true,
        submenu: [
          { name: 'Stock Overview', href: '/dashboard/warehouse-stock', icon: Package },
          { name: 'Stock by Warehouse', href: '/dashboard/warehouse-stock/warehouses', icon: Warehouse },
          { name: 'Stock by Zone', href: '/dashboard/warehouse-stock/zones', icon: MapPin },
          { name: 'Stock Transactions', href: '/dashboard/warehouse-stock/transactions', icon: ArrowLeftRight },
          { name: 'Capacity Alerts', href: '/dashboard/warehouse-stock/alerts', icon: AlertTriangle },
          { name: 'Reorder Alerts', href: '/dashboard/stock/reorder', icon: AlertTriangle },
        ]
      },
      {
        name: 'Batches',
        href: '/dashboard/raw-materials/batches',
        icon: Package,
        hasSubmenu: false,
      },
    ]
  },
  {
    name: 'Purchases',
    items: [
      {
        name: 'Purchase Orders',
        href: '/dashboard/purchases',
        icon: ShoppingCart,
        hasSubmenu: true,
        submenu: [
          { name: 'Purchase Orders', href: '/dashboard/purchases', icon: ShoppingCart },
          { name: 'Create PO', href: '/dashboard/purchases/create', icon: Plus },
          { name: 'Purchase Returns', href: '/dashboard/purchases/returns/list', icon: RotateCcw },
          { name: 'Draft', href: '/dashboard/purchases?status=DRAFT', icon: FileText },
          { name: 'Sent', href: '/dashboard/purchases?status=CONFIRMED', icon: ArrowLeftRight },
          { name: 'Partial', href: '/dashboard/purchases?status=PARTIAL', icon: Clock },
          { name: 'Completed', href: '/dashboard/purchases?status=RECEIVED', icon: CheckCircle },
          { name: 'Cancelled', href: '/dashboard/purchases?status=CANCELLED', icon: Ban },
        ]
      },

    ]
  },
  {
    name: 'Material Management',
    items: [
      {
        name: 'GRN',
        href: '/dashboard/factory/receiving',
        icon: PackageSearch,
        hasSubmenu: true,
        submenu: [
          { name: 'All GRNs', href: '/dashboard/factory/receiving', icon: PackageSearch },
          { name: 'Create GRN', href: '/dashboard/factory/receiving/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/factory/receiving?status=PENDING', icon: AlertTriangle },
          { name: 'Inspecting', href: '/dashboard/factory/receiving?status=INSPECTING', icon: Activity },
          { name: 'Approved', href: '/dashboard/factory/receiving?status=APPROVED', icon: CheckCircle },
          { name: 'Completed', href: '/dashboard/factory/receiving?status=COMPLETED', icon: PackageSearch },
          { name: 'Rejected', href: '/dashboard/factory/receiving?status=REJECTED', icon: X },
        ]
      },
      {
        name: 'Material Requests',
        href: '/dashboard/factory/material-requests',
        icon: ClipboardList,
        hasSubmenu: true,
        submenu: [
          { name: 'All Requests', href: '/dashboard/factory/material-requests', icon: ClipboardList },
          { name: 'Create Request', href: '/dashboard/factory/material-requests/create', icon: Plus },
          { name: 'Drafts', href: '/dashboard/factory/material-requests?status=DRAFT', icon: FileText },
          { name: 'Pending Approval', href: '/dashboard/factory/material-requests?status=PENDING', icon: AlertTriangle },
          { name: 'Approved', href: '/dashboard/factory/material-requests?status=APPROVED', icon: CheckCircle },
          { name: 'Rejected', href: '/dashboard/factory/material-requests?status=REJECTED', icon: X },
          { name: 'Fulfilled', href: '/dashboard/factory/material-requests?status=FULFILLED', icon: ArrowLeftRight },
          { name: 'Cancelled', href: '/dashboard/factory/material-requests?status=CANCELLED', icon: X },
        ]
      },
      {
        name: 'Material Transfers',
        href: '/dashboard/factory/material-transfers',
        icon: ArrowLeftRight,
        hasSubmenu: true,
        submenu: [
          { name: 'All Transfers', href: '/dashboard/factory/material-transfers', icon: ArrowLeftRight },
          { name: 'Create Transfer', href: '/dashboard/factory/material-transfers/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/factory/material-transfers?status=PENDING', icon: AlertTriangle },
          { name: 'Approved', href: '/dashboard/factory/material-transfers?status=APPROVED', icon: CheckCircle },
          { name: 'In Transit', href: '/dashboard/factory/material-transfers?status=IN_TRANSIT', icon: Activity },
          { name: 'Received', href: '/dashboard/factory/material-transfers?status=RECEIVED', icon: CheckCircle },
          { name: 'Cancelled', href: '/dashboard/factory/material-transfers?status=CANCELLED', icon: X },
        ]
      },
    ]
  },
  {
    name: 'Production',
    items: [
      {
        name: 'Production Orders',
        href: '/dashboard/production-orders',
        icon: Factory,
        hasSubmenu: true,
        submenu: [
          { name: 'All Orders', href: '/dashboard/production-orders', icon: Factory },
          { name: 'Create Order', href: '/dashboard/production-orders/create', icon: Plus },
          { name: 'Drafts', href: '/dashboard/production-orders?status=DRAFT', icon: FileText },
          { name: 'In Progress', href: '/dashboard/production-orders?status=IN_PROGRESS', icon: Activity },
          { name: 'Completed', href: '/dashboard/production-orders?status=COMPLETED', icon: CheckCircle },
          { name: 'Cancelled', href: '/dashboard/production-orders?status=CANCELLED', icon: X },
        ]
      },
      {
        name: 'Plants',
        href: '/dashboard/plants',
        icon: Factory,
        hasSubmenu: true,
        submenu: [
          { name: 'All Plants', href: '/dashboard/plants', icon: Factory },
          { name: 'Create Plant', href: '/dashboard/factory/plants/create', icon: Plus },
          { name: 'Production Lines', href: '/dashboard/plants/lines', icon: TrendingUp },
          { name: 'Machines', href: '/dashboard/plants/machines', icon: Settings },
        ]
      },
      {
        name: 'Work Orders',
        href: '/dashboard/work-orders',
        icon: ClipboardList,
        hasSubmenu: true,
        submenu: [
          { name: 'All Orders', href: '/dashboard/work-orders', icon: ClipboardList },
          { name: 'Create Order', href: '/dashboard/work-orders/create', icon: Plus },
          { name: 'Drafts', href: '/dashboard/work-orders?status=DRAFT', icon: FileText },
          { name: 'Scheduled', href: '/dashboard/work-orders?status=SCHEDULED', icon: Clock },
          { name: 'In Progress', href: '/dashboard/work-orders?status=IN_PROGRESS', icon: Activity },
          { name: 'Completed', href: '/dashboard/work-orders?status=COMPLETED', icon: CheckCircle },
          { name: 'Canceled', href: '/dashboard/work-orders?status=CANCELLED', icon: Ban },
        ]
      },
      {
        name: 'BOM',
        href: '/dashboard/bom',
        icon: FileText,
        hasSubmenu: true,
        submenu: [
          { name: 'All BOMs', href: '/dashboard/bom', icon: FileText },
          { name: 'Create BOM', href: '/dashboard/bom/create', icon: Plus },
          { name: 'Drafts', href: '/dashboard/bom?status=DRAFT', icon: FileText },
          { name: 'Active BOMs', href: '/dashboard/bom?status=ACTIVE', icon: CheckCircle },
          { name: 'Inactive', href: '/dashboard/bom?status=INACTIVE', icon: X },
        ]
      },
      {
        name: 'Product Batches',
        href: '/dashboard/product-batches',
        icon: Boxes,
        hasSubmenu: true,
        submenu: [
          { name: 'All Batches', href: '/dashboard/product-batches', icon: Boxes },
          { name: 'Finished Goods', href: '/dashboard/product-batches?isFinal=final', icon: CheckCircle },
          { name: 'Work In Progress', href: '/dashboard/product-batches?isFinal=wip', icon: Activity },
          { name: 'Active', href: '/dashboard/product-batches?status=ACTIVE', icon: CheckCircle },
          { name: 'Quarantine', href: '/dashboard/product-batches?status=QUARANTINE', icon: AlertTriangle },
        ]
      },
    ]
  },
  {
    name: 'Quality & Control',
    items: [
      {
        name: 'Quality Control',
        href: '/dashboard/quality-control/inspections',
        icon: Shield,
        hasSubmenu: true,
        submenu: [
          { name: 'Inspections', href: '/dashboard/quality-control/inspections', icon: ClipboardList },
          { name: 'Create Inspection', href: '/dashboard/quality-control/inspections/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/quality-control/inspections?status=PENDING', icon: Clock },
          { name: 'Passed', href: '/dashboard/quality-control/inspections?status=PASSED', icon: CheckCircle },
          { name: 'Failed', href: '/dashboard/quality-control/inspections?status=FAILED', icon: X },
          { name: 'Conditional', href: '/dashboard/quality-control/inspections?status=CONDITIONAL', icon: AlertTriangle },
        ]
      },
      {
        name: 'Waste Management',
        href: '/dashboard/waste-management',
        icon: Trash2,
        hasSubmenu: true,
        submenu: [
          { name: 'All Records', href: '/dashboard/waste-management', icon: Trash2 },
          { name: 'Record Waste', href: '/dashboard/waste-management/create', icon: Plus },
          { name: 'By Type', href: '/dashboard/waste-management?groupBy=TYPE', icon: Tag },
        ]
      },
    ]
  },
  {
    name: 'Costing & Reports',
    items: [
      {
        name: 'Costing',
        href: '/dashboard/factory/costing',
        icon: Wallet,
        hasSubmenu: true,
        submenu: [
          { name: 'Cost Dashboard', href: '/dashboard/factory/costing', icon: BarChart3 },
          { name: 'Profitability', href: '/dashboard/factory/profit', icon: TrendingUp },
          { name: 'Cost Reports', href: '/dashboard/factory/costing/reports', icon: FileText },
        ]
      },
      {
        name: 'Factory Reports',
        href: '/dashboard/factory/reports',
        icon: FileText,
        hasSubmenu: true,
        submenu: [
          { name: 'Reports Dashboard', href: '/dashboard/factory/reports', icon: FileText },
          { name: 'Production Reports', href: '/dashboard/factory/reports/production', icon: Factory },
          { name: 'Material Reports', href: '/dashboard/factory/reports/material', icon: Package },
          { name: 'Quality Reports', href: '/dashboard/factory/reports/quality', icon: AlertTriangle },
          { name: 'Waste Reports', href: '/dashboard/factory/reports/waste', icon: Trash2 },
          { name: 'Warehouse Reports', href: '/dashboard/factory/reports/warehouse', icon: Warehouse },
        ]
      },
    ],
  },
  {
    name: 'Sales',
    items: [
      {
        name: 'Sales Orders',
        href: '/dashboard/sales',
        icon: ShoppingBag,
        hasSubmenu: true,
        submenu: [
          { name: 'Sales Orders', href: '/dashboard/sales', icon: ShoppingBag },
          { name: 'Create Sale', href: '/dashboard/sales/create', icon: Plus },
          { name: 'Sale Dispatches', href: '/dashboard/sales/dispatches', icon: Truck },
          { name: 'Sale Returns', href: '/dashboard/sales/returns', icon: RotateCcw },
        ],
      },
      {
        name: 'Shop Orders',
        href: '/dashboard/sales/customer-orders',
        icon: ClipboardList,
        hasSubmenu: true,
        submenu: [
          { name: 'All Orders', href: '/dashboard/sales/customer-orders', icon: ClipboardList },
          { name: 'Book Order', href: '/dashboard/sales/customer-orders/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/sales/customer-orders?status=PENDING', icon: Clock },
          {
            name: 'Partial',
            href: '/dashboard/sales/customer-orders?status=PARTIALLY_DELIVERED',
            icon: Activity,
          },
          {
            name: 'Delivered',
            href: '/dashboard/sales/customer-orders?status=DELIVERED',
            icon: CheckCircle,
          },
          { name: 'Cancelled', href: '/dashboard/sales/customer-orders?status=CANCELLED', icon: Ban },
        ],
      },
      {
        name: 'Shop Deliveries',
        href: '/dashboard/sales/customer-deliveries',
        icon: Truck,
        hasSubmenu: true,
        submenu: [
          { name: 'All Deliveries', href: '/dashboard/sales/customer-deliveries', icon: Truck },
          { name: 'Pending', href: '/dashboard/sales/customer-deliveries?status=PENDING', icon: Clock },
          {
            name: 'Delivered',
            href: '/dashboard/sales/customer-deliveries?status=DELIVERED',
            icon: CheckCircle,
          },
          { name: 'Cancelled', href: '/dashboard/sales/customer-deliveries?status=CANCELLED', icon: Ban },
        ],
      },
      {
        name: 'Shop Returns',
        href: '/dashboard/sales/customer-returns',
        icon: RotateCcw,
        hasSubmenu: true,
        submenu: [
          { name: 'All Returns', href: '/dashboard/sales/customer-returns', icon: RotateCcw },
          { name: 'Record Return', href: '/dashboard/sales/customer-returns/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/sales/customer-returns?status=PENDING', icon: Clock },
          { name: 'Approved', href: '/dashboard/sales/customer-returns?status=APPROVED', icon: CheckCircle },
          { name: 'Rejected', href: '/dashboard/sales/customer-returns?status=REJECTED', icon: X },
        ],
      },
      {
        name: 'Shop Recovery',
        href: '/dashboard/sales/customer-recovery',
        icon: Wallet,
        hasSubmenu: true,
        submenu: [
          { name: 'All Recoveries', href: '/dashboard/sales/customer-recovery', icon: Wallet },
          { name: 'Record Recovery', href: '/dashboard/sales/customer-recovery/create', icon: Plus },
        ],
      },
      {
        name: 'Shop Credit/Debit Notes',
        href: '/dashboard/sales/customer-adjustments',
        icon: FileText,
        hasSubmenu: true,
        submenu: [
          { name: 'All Notes', href: '/dashboard/sales/customer-adjustments', icon: FileText },
          { name: 'Credit Notes', href: '/dashboard/sales/customer-adjustments?type=CREDIT_NOTE', icon: Plus },
          { name: 'Debit Notes', href: '/dashboard/sales/customer-adjustments?type=DEBIT_NOTE', icon: Plus },
          { name: 'Post Note', href: '/dashboard/sales/customer-adjustments/create', icon: Plus },
        ],
      },
      {
        name: 'Shop Product Adjustments',
        href: '/dashboard/sales/product-adjustments',
        icon: PackageSearch,
        hasSubmenu: true,
        submenu: [
          { name: 'All Adjustments', href: '/dashboard/sales/product-adjustments', icon: PackageSearch },
          { name: 'Record Adjustment', href: '/dashboard/sales/product-adjustments/create', icon: Plus },
          { name: 'Additions', href: '/dashboard/sales/product-adjustments?type=ADDITION', icon: Plus },
          { name: 'Deductions', href: '/dashboard/sales/product-adjustments?type=DEDUCTION', icon: RotateCcw },
        ],
      },
      {
        name: 'Shop Ledger',
        href: '/dashboard/sales/customer-ledger',
        icon: BookOpen,
        hasSubmenu: false,
      },
      {
        name: 'Branch Stock',
        href: '/dashboard/sales/branch-stock',
        icon: Warehouse,
        hasSubmenu: false,
      },
      {
        name: 'Branch Ledger',
        href: '/dashboard/sales/branch-ledger',
        icon: History,
        hasSubmenu: true,
        submenu: [
          { name: 'All Entries', href: '/dashboard/sales/branch-ledger', icon: History },
          {
            name: 'Stock Received',
            href: '/dashboard/sales/branch-ledger?type=STOCK_RECEIVED',
            icon: Truck,
          },
          { name: 'Payments', href: '/dashboard/sales/branch-ledger?type=PAYMENT', icon: Wallet },
          {
            name: 'Stock Returned',
            href: '/dashboard/sales/branch-ledger?type=STOCK_RETURNED',
            icon: RotateCcw,
          },
        ],
      },
      {
        name: 'Branch Stock Requests',
        href: '/dashboard/sales/branch-stock-requests',
        icon: ClipboardList,
        hasSubmenu: true,
        submenu: [
          { name: 'All Requests', href: '/dashboard/sales/branch-stock-requests', icon: ClipboardList },
          { name: 'New Request', href: '/dashboard/sales/branch-stock-requests/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/sales/branch-stock-requests?status=PENDING', icon: Clock },
          {
            name: 'Approved',
            href: '/dashboard/sales/branch-stock-requests?status=APPROVED',
            icon: CheckCircle,
          },
          { name: 'Rejected', href: '/dashboard/sales/branch-stock-requests?status=REJECTED', icon: X },
        ],
      },
      {
        name: 'Branch Stock Transfers',
        href: '/dashboard/sales/branch-stock-transfers',
        icon: ArrowLeftRight,
        hasSubmenu: true,
        submenu: [
          { name: 'All Transfers', href: '/dashboard/sales/branch-stock-transfers', icon: ArrowLeftRight },
          { name: 'Pending', href: '/dashboard/sales/branch-stock-transfers?status=PENDING', icon: Clock },
          {
            name: 'Dispatched',
            href: '/dashboard/sales/branch-stock-transfers?status=DISPATCHED',
            icon: Truck,
          },
          {
            name: 'Received',
            href: '/dashboard/sales/branch-stock-transfers?status=RECEIVED',
            icon: CheckCircle,
          },
          { name: 'Cancelled', href: '/dashboard/sales/branch-stock-transfers?status=CANCELLED', icon: Ban },
        ],
      },
      {
        name: 'Branch Stock Returns',
        href: '/dashboard/sales/branch-stock-returns',
        icon: RotateCcw,
        hasSubmenu: true,
        submenu: [
          { name: 'All Returns', href: '/dashboard/sales/branch-stock-returns', icon: RotateCcw },
          { name: 'Record Return', href: '/dashboard/sales/branch-stock-returns/create', icon: Plus },
          { name: 'Pending', href: '/dashboard/sales/branch-stock-returns?status=PENDING', icon: Clock },
          {
            name: 'Approved',
            href: '/dashboard/sales/branch-stock-returns?status=APPROVED',
            icon: CheckCircle,
          },
          { name: 'Rejected', href: '/dashboard/sales/branch-stock-returns?status=REJECTED', icon: X },
        ],
      },
      {
        name: 'Factory Stock',
        href: '/dashboard/sales/factory-stock',
        icon: Factory,
        hasSubmenu: false,
      },
      {
        name: 'Trade Price Lists',
        href: '/dashboard/sales/price-lists',
        icon: Tags,
        hasSubmenu: false,
      },
      {
        name: 'Branch Product Prices',
        href: '/dashboard/sales/branch-product-prices',
        icon: DollarSign,
        hasSubmenu: false,
      },
      {
        name: 'Employee Cash',
        href: '/dashboard/sales/employee-cash',
        icon: Wallet,
        hasSubmenu: true,
        submenu: [
          { name: 'Cash Ledger', href: '/dashboard/sales/employee-cash', icon: Wallet },
          { name: 'Transfers', href: '/dashboard/sales/employee-cash/transfers', icon: ArrowLeftRight },
          { name: 'Record Transfer', href: '/dashboard/sales/employee-cash/transfers/create', icon: Plus },
        ],
      },
      {
        name: 'Territory Setup',
        href: '/dashboard/sales/territory',
        icon: MapPin,
        hasSubmenu: false,
      },
      {
        name: 'Sales Person Assignments',
        href: '/dashboard/sales/sales-person-assignments',
        icon: UserCheck,
        hasSubmenu: false,
      },
      {
        name: 'Customer Categories',
        href: '/dashboard/sales/customer-categories',
        icon: Tag,
        hasSubmenu: false,
      },
      {
        name: 'Product Bonus Groups',
        href: '/dashboard/sales/product-bonus-groups',
        icon: Gift,
        hasSubmenu: false,
      },
      {
        name: 'Product Bonus Schemes',
        href: '/dashboard/sales/product-bonus-schemes',
        icon: BadgePercent,
        hasSubmenu: false,
      },
      {
        name: 'Transporters',
        href: '/dashboard/sales/transporters',
        icon: Truck,
        hasSubmenu: false,
      },
      {
        name: 'Customers',
        href: '/dashboard/customers',
        icon: Users,
        hasSubmenu: false,
      },
      {
        name: 'Brokers',
        href: '/dashboard/brokers',
        icon: Briefcase,
        hasSubmenu: true,
        submenu: [
          { name: 'Broker List', href: '/dashboard/brokers', icon: Briefcase },
          { name: 'Add Broker', href: '/dashboard/brokers/create', icon: Plus },
        ],
      },
    ],
  },
  {
    name: 'Profit',
    items: [
      {
        name: 'Profit Overview',
        href: '/dashboard/profit',
        icon: TrendingUp,
        hasSubmenu: true,
        submenu: [
          { name: 'Overview', href: '/dashboard/profit', icon: TrendingUp },
          { name: 'Daily Profit', href: '/dashboard/profit/daily', icon: Calendar },
          { name: 'Monthly Profit', href: '/dashboard/profit/monthly', icon: Calendar },
          { name: 'Product Profit', href: '/dashboard/profit/product', icon: Package },
          { name: 'Plant Profit', href: '/dashboard/profit/plant', icon: Factory },
        ]
      },
    ]
  },
  {
    name: 'HR',
    items: [
      {
        name: 'HR Core',
        href: '/dashboard/hr/employees',
        icon: Users,
        hasSubmenu: true,
        submenu: [
          { name: 'Employees', href: '/dashboard/hr/employees', icon: Users },
          { name: 'Managers', href: '/dashboard/hr/managers', icon: UserCog },
          { name: 'Departments', href: '/dashboard/hr/departments', icon: Briefcase },
          { name: 'Positions', href: '/dashboard/hr/positions', icon: Briefcase },
          { name: 'Contracts', href: '/dashboard/hr/contracts', icon: FileText },
          { name: 'Org Units', href: '/dashboard/hr/org-units', icon: Briefcase },
          { name: 'Org Chart', href: '/dashboard/hr/org-chart', icon: LayoutDashboard },
          { name: 'Grades', href: '/dashboard/hr/grades', icon: BarChart3 },
          { name: 'HR Config', href: '/dashboard/hr/config', icon: Settings },
          { name: 'HR Settings', href: '/dashboard/hr/settings', icon: Settings },
          { name: 'Attendance', href: '/dashboard/hr/attendance', icon: Clock },
          { name: 'Shifts', href: '/dashboard/hr/shifts', icon: Calendar },
          { name: 'Leave', href: '/dashboard/hr/leave', icon: Archive },
          { name: 'Holidays', href: '/dashboard/hr/holidays', icon: Calendar },
          { name: 'Payroll', href: '/dashboard/hr/payroll', icon: DollarSign },
          { name: 'Loans', href: '/dashboard/hr/loans', icon: Wallet },
          { name: 'Recruitment', href: '/dashboard/hr/recruitment', icon: Users, badge: 'New' },
        ]
      },
    ]
  },
  {
    name: 'Financial',
    items: [
      {
        name: 'Financial Management',
        href: '/dashboard/financial',
        icon: DollarSign,
        hasSubmenu: true,
        submenu: [
          { name: 'Financial Dashboard', href: '/dashboard/financial', icon: BarChart3 },
          { name: 'Chart of Accounts', href: '/dashboard/financial/coa', icon: FileText },
          { name: 'Add Account', href: '/dashboard/financial/coa/create', icon: Plus },
          { name: 'Journal Entries', href: '/dashboard/financial/journal', icon: FileText },
          { name: 'New Entry', href: '/dashboard/financial/journal/create', icon: Plus },
          { name: 'Financial Reports', href: '/dashboard/financial/reports', icon: TrendingUp },
          { name: 'AP Aging', href: '/dashboard/financial/accounts-payable/aging', icon: Clock },
          { name: 'AR Aging', href: '/dashboard/financial/accounts-receivable/aging', icon: Clock },
          { name: 'AP Bills', href: '/dashboard/financial/accounts-payable/bills', icon: FileText },
          { name: 'AP Payments', href: '/dashboard/financial/accounts-payable/payments', icon: Wallet },
          { name: 'Vendors', href: '/dashboard/financial/accounts-payable/vendors', icon: Archive },
          { name: 'AR Invoices', href: '/dashboard/financial/accounts-receivable/invoices', icon: FileText },
          { name: 'AR Payments', href: '/dashboard/financial/accounts-receivable/payments', icon: Wallet },
          { name: 'Create Invoice', href: '/dashboard/financial/accounts-receivable/invoices/new', icon: Plus },
          { name: 'Record Payment', href: '/dashboard/financial/accounts-receivable/payments/new', icon: Plus },
          { name: 'Bank Accounts', href: '/dashboard/financial/cash-management/accounts', icon: DollarSign },
          { name: 'Bank Transactions', href: '/dashboard/financial/cash-management/transactions', icon: ArrowLeftRight },
          { name: 'Cash Transactions', href: '/dashboard/financial/cash-management/transactions/new', icon: ArrowLeftRight },
          { name: 'Fixed Assets', href: '/dashboard/financial/fixed-assets', icon: Package },
          { name: 'Add Fixed Asset', href: '/dashboard/financial/fixed-assets/new', icon: Plus },
          { name: 'Depreciation Run', href: '/dashboard/financial/fixed-assets/depreciation/run', icon: RotateCcw },
          { name: 'Budgets', href: '/dashboard/financial/budgeting', icon: BookOpen },
          { name: 'Budget Variance', href: '/dashboard/financial/budgeting/variance', icon: TrendingUp },
          { name: 'Cash Flow', href: '/dashboard/financial/reports/cash-flow', icon: DollarSign },
          { name: 'Profit & Loss', href: '/dashboard/financial/reports/profit-loss', icon: TrendingUp },
          { name: 'Balance Sheet', href: '/dashboard/financial/reports/balance-sheet', icon: BarChart3 },
          { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
          { name: 'Add Expense', href: '/dashboard/expenses/add', icon: Plus },
          { name: 'Expense Reports', href: '/dashboard/expenses/reports', icon: BarChart3 },
          { name: 'Cash in Hand', href: '/dashboard/cash-in-hand', icon: Wallet },
        ]
      },
    ]
  },
  {
    name: 'System',
    items: [
      { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText, hasSubmenu: false },
      {
        name: 'Users',
        href: '/dashboard/users',
        icon: UserCog,
        hasSubmenu: true,
        submenu: [
          { name: 'All Users', href: '/dashboard/users', icon: UserCog },
        ]
      },
      {
        name: 'Settings',
        href: '/dashboard/settings/account',
        icon: Settings,
        hasSubmenu: true,
        submenu: [
          { name: 'Account Settings', href: '/dashboard/settings/account', icon: Settings },
          { name: 'Roles & Permissions', href: '/dashboard/settings/roles-permissions', icon: Shield },
        ]
      },
    ]
  },
]

// Flatten for backward compatibility
const navigation = navigationSections.flatMap(section => section.items)

export function Sidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar()

  const closeMobileSidebar = useCallback(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      closeSidebar()
    }
  }, [closeSidebar])
  const { data: branding } = useBranding()
  const { hasPermission, hasAnyPermission, isLoading: permissionsLoading } = usePermissionCheck()

  const permissionContext = {
    hasPermission,
    hasAnyPermission,
    isLoading: permissionsLoading,
  }

  const canViewItem = (item: { href: string }): boolean =>
    canViewNavHref(item.href, permissionContext)

  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (!('submenu' in item) || !item.hasSubmenu || !item.submenu) {
            return canViewItem(item) ? item : null
          }

          const visibleSubmenu = item.submenu.filter((subItem: { href: string }) =>
            canViewItem(subItem),
          )
          if (visibleSubmenu.length === 0) {
            return null
          }

          return { ...item, submenu: visibleSubmenu }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    }))
    .filter((section) => section.items.length > 0)

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => new Set())

  const isItemActive = (item: { href: string; hasSubmenu?: boolean; submenu?: { href: string }[] }) => {
    // Remove query params for comparison
    const currentPath = pathname.split('?')[0]
    const itemHref = item.href.split('?')[0]

    // Check if any submenu item is active first
    if (item.hasSubmenu && item.submenu) {
      return item.submenu.some((subItem: any) => {
        const subHref = subItem.href.split('?')[0] // Remove query params
        // Exact match or child path
        return currentPath === subHref || currentPath.startsWith(subHref + '/')
      })
    }

    // For items without submenu, only match exact paths
    // This prevents /dashboard from matching /dashboard/factory/warehouses
    // and /dashboard/factory from matching /dashboard/factory/warehouses
    return currentPath === itemHref
  }

  const isSubItemActive = (subItem: any, siblings: any[] = []) => {
    const currentPath = pathname.split('?')[0] // Remove query params from pathname
    const subHref = subItem.href.split('?')[0] // Remove query params from submenu href
    const subQuery = subItem.href.includes('?') ? subItem.href.split('?')[1] : null // Get query params from submenu href

    // Check path match first
    const isExact = currentPath === subHref
    const isPrefix = currentPath.startsWith(subHref + '/')
    const pathMatches = isExact || isPrefix

    if (!pathMatches) {
      return false
    }

    // Prefix-collision guard (QA #5): a shorter parent path (e.g. "Supplier List" →
    // /dashboard/suppliers) must NOT stay active when a sibling with a more specific
    // path (e.g. "Supplier Ledger" → /dashboard/suppliers/ledger) is the real match.
    // Only applies to prefix (non-exact) matches; if a sibling is an exact match or a
    // longer prefix match for the current path, defer to it.
    if (isPrefix && !isExact) {
      const hasMoreSpecificSibling = siblings.some((sib: any) => {
        if (sib === subItem) return false
        const sibHref = sib.href.split('?')[0]
        if (sibHref.length <= subHref.length) return false
        return currentPath === sibHref || currentPath.startsWith(sibHref + '/')
      })
      if (hasMoreSpecificSibling) {
        return false
      }
    }

    // If submenu item has query params, check if they match
    if (subQuery) {
      const subQueryParams = new URLSearchParams(subQuery)

      // Check if all query params in submenu item match current URL params
      const entries = Array.from(subQueryParams.entries())
      for (const [key, value] of entries) {
        if (searchParams.get(key) !== value) {
          return false
        }
      }
      return true
    }

    // If submenu item has no query params (e.g., "All Work Orders"), 
    // it should only be active if current URL also has no relevant query params
    if (!subQuery) {
      if (subHref === '/dashboard/factory/warehouses') {
        return !searchParams.has('type')
      }
      if (subHref === '/dashboard/work-orders') {
        return !searchParams.has('status')
      }
      if (subHref === '/dashboard/purchases') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/purchases/returns/list') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/bom') {
        return !searchParams.has('status')
      }
      if (subHref === '/dashboard/factory/receiving') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/factory/material-requests') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/factory/material-transfers') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/production-orders') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/product-batches') {
        return !searchParams.get('status') && !searchParams.get('isFinal')
      }
      if (subHref === '/dashboard/quality-control/inspections') {
        return !searchParams.get('status') && !searchParams.get('stage')
      }
      if (subHref === '/dashboard/sales/customer-orders') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/sales/customer-deliveries') {
        return !searchParams.get('status') && !searchParams.get('orderId')
      }
      if (subHref === '/dashboard/sales/customer-returns') {
        return !searchParams.get('status') && !searchParams.get('deliveryItemId')
      }
      if (subHref === '/dashboard/sales/customer-recovery') {
        return !searchParams.get('customerId')
      }
      if (subHref === '/dashboard/sales/customer-adjustments') {
        return !searchParams.get('type') && !searchParams.get('customerId')
      }
      if (subHref === '/dashboard/sales/product-adjustments') {
        return !searchParams.get('type') && !searchParams.get('customerId')
      }
      if (subHref === '/dashboard/sales/branch-ledger') {
        return !searchParams.get('type')
      }
      if (subHref === '/dashboard/sales/branch-stock-requests') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/sales/branch-stock-transfers') {
        return !searchParams.get('status') && !searchParams.get('requestId')
      }
      if (subHref === '/dashboard/sales/branch-stock-returns') {
        return !searchParams.get('status')
      }
      if (subHref === '/dashboard/waste-management') {
        return !searchParams.get('groupBy')
      }
    }

    return true
  }

  // Keep the parent module expanded when the current route matches one of its submenu items.
  useEffect(() => {
    setExpandedMenus((previous) => {
      const next = new Set(previous)
      visibleSections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.hasSubmenu && isItemActive(item)) {
            next.add(item.href)
          }
        })
      })
      return next
    })
  }, [pathname, searchParams, permissionsLoading])

  const isSubmenuExpanded = (item: { href: string }) => expandedMenus.has(item.href)

  const toggleSubmenu = (itemHref: string) => {
    setExpandedMenus((previous) => {
      const next = new Set(previous)
      if (next.has(itemHref)) {
        next.delete(itemHref)
      } else {
        next.add(itemHref)
      }
      return next
    })
  }

  const navigateToMenuItem = (item: { href: string }) => {
    if (isSubmenuExpanded(item)) {
      // Clicking the module again should collapse it (chevron or not).
      toggleSubmenu(item.href)
      return
    }

    // First click expands the module and navigates to its landing route.
    router.push(item.href)
    setExpandedMenus((previous) => new Set(previous).add(item.href))
    closeMobileSidebar()
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar — always anchored left with explicit width; pointer-events off when slid off-screen so main content scrolls normally */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex max-w-72 flex-col overflow-x-hidden transition-all duration-300 ease-in-out',
          isOpen
            ? 'w-72 translate-x-0 pointer-events-auto'
            : 'pointer-events-none w-72 -translate-x-full lg:w-16 lg:translate-x-0 lg:pointer-events-auto',
        )}
      >
        <div className={cn(
          "flex grow flex-col gap-y-2 overflow-y-auto bg-white border-r border-gray-200 shadow-lg scrollbar-visible",
          isOpen ? "px-4 pb-4" : "px-2 pb-2"
        )}>
          <div className={cn(
            "flex shrink-0 items-center justify-center p-0 m-0 transition-all duration-300",
            isOpen ? "h-28" : "h-16"
          )}>
            <div className="flex items-center justify-center w-full h-full p-0 m-0 relative">
              {/* Logo - Clickable */}
              <Link
                href="/dashboard"
                onClick={closeMobileSidebar}
                className="cursor-pointer hover:opacity-80 transition-opacity group flex items-center justify-center p-0 m-0 h-full w-full"
              >
                <div className={cn(
                  "flex flex-shrink-0 items-center justify-center overflow-hidden p-0 m-0 transition-all duration-300",
                  isOpen ? "h-28 w-28" : "h-14 w-14"
                )}>
                  <Image
                    src={branding?.logoUrl || '/images/logo.png'}
                    alt={`${branding?.name || 'Malind Tech'} Logo`}
                    width={isOpen ? 128 : 56}
                    height={isOpen ? 128 : 56}
                    className="object-contain p-0 m-0 transition-all duration-300"
                    priority
                  />
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="lg:hidden absolute right-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto">
            <ul role="list" className="flex flex-1 flex-col gap-y-4">
              {permissionsLoading ? (
                <li className="px-3 py-8 text-center text-sm text-gray-400">Loading menu…</li>
              ) : (
                visibleSections.map((section, sectionIndex) => (
                <li key={section.name} className={sectionIndex > 0 ? 'mt-2' : ''}>
                  {isOpen && (
                    <div className="px-2 mb-2 mt-5 first:mt-0">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-3 py-2 rounded-md bg-gradient-to-r from-green-100 via-green-50 to-transparent border-l-4 border-green-600 shadow-sm">
                        {section.name}
                      </h3>
                    </div>
                  )}
                  {!isOpen && sectionIndex > 0 && (
                    <div className="mx-2 my-3 flex flex-col items-center gap-1" title={section.name}>
                      <div className="h-1 w-8 rounded-full bg-green-600" />
                    </div>
                  )}
                  <ul role="list" className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = isItemActive(item)

                      return (
                        <li key={item.name}>
                          {item.hasSubmenu ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => navigateToMenuItem(item)}
                                title={!isOpen ? `Go to ${item.name}` : undefined}
                                aria-expanded={isSubmenuExpanded(item)}
                                className={cn(
                                  isActive
                                    ? 'bg-green-50 text-green-700 border-2 border-green-400 shadow-sm'
                                    : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300',
                                  'group flex w-full items-center rounded-lg text-sm leading-6 font-semibold transition-all duration-300',
                                  isOpen ? 'gap-x-2 p-3' : 'justify-center p-2'
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600',
                                    'h-6 w-6 shrink-0 transition-colors duration-300',
                                    !isOpen && 'mx-auto'
                                  )}
                                  aria-hidden="true"
                                />
                                <span
                                  className={cn(
                                    'text-left transition-all duration-300 whitespace-nowrap',
                                    isOpen ? 'opacity-100 flex-1 overflow-visible' : 'opacity-0 w-0 overflow-hidden'
                                  )}
                                >
                                  {item.name}
                                </span>
                                {isOpen && (item as any).badge && (
                                  <Badge
                                    variant="secondary"
                                    title="This module is currently under development. Please avoid heavy use until the final release."
                                    aria-label="Module under development"
                                    className="text-[10px] leading-tight px-1.5 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100 transition-all duration-300 shrink-0 font-medium whitespace-nowrap ml-1"
                                  >
                                    {(item as any).badge}
                                  </Badge>
                                )}
                                {isOpen && (
                                  isSubmenuExpanded(item) ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 ml-1 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 ml-1 text-gray-500" />
                                  )
                                )}
                              </button>
                              {isSubmenuExpanded(item) && isOpen && 'submenu' in item && item.submenu && (
                                <ul className="mt-1 space-y-1 ml-2">
                                  {item.submenu.map((subItem: any) => {
                                    const isSubActive = isSubItemActive(subItem, item.submenu)
                                    return (
                                      <li key={subItem.name}>
                                        <Link
                                          href={subItem.href}
                                          onClick={closeMobileSidebar}
                                          className={cn(
                                            isSubActive
                                              ? 'bg-green-50 text-green-700 font-semibold border-l-4 border-green-500 shadow-sm'
                                              : 'text-gray-600 hover:text-green-600 hover:bg-gray-50 border-l-2 border-transparent hover:border-gray-300',
                                            'group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm transition-all duration-300'
                                          )}
                                        >
                                          <div className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                                          <span className="whitespace-nowrap">{subItem.name}</span>
                                        </Link>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={closeMobileSidebar}
                              className={cn(
                                isActive
                                  ? 'bg-green-50 text-green-700 border-2 border-green-400 shadow-sm'
                                  : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300',
                                'group flex rounded-lg text-sm leading-6 font-semibold transition-all duration-300',
                                isOpen ? 'gap-x-3 p-3' : 'justify-center p-2'
                              )}
                              title={!isOpen || (item as any).shortName ? item.name : undefined}
                            >
                              <item.icon
                                className={cn(
                                  isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600',
                                  'h-6 w-6 shrink-0 transition-colors duration-300',
                                  !isOpen && 'mx-auto'
                                )}
                                aria-hidden="true"
                              />
                              <span className={cn(
                                "transition-all duration-300 whitespace-nowrap",
                                isOpen ? "opacity-100 max-w-full" : "opacity-0 w-0 overflow-hidden"
                              )}>{(item as any).shortName || item.name}</span>
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))
              )}
              <li className="mt-auto pb-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300",
                    isOpen ? "justify-start p-3" : "justify-center p-2"
                  )}
                  onClick={() => {
                    // Clear POS session data before logout
                    sessionStorage.removeItem('pos-selected-location');
                    sessionStorage.removeItem('pos-session-id');
                    sessionStorage.removeItem('pos-session-location');
                    sessionStorage.removeItem('pos-last-session');
                    // Then logout
                    logout();
                  }}
                  title={!isOpen ? 'Sign out' : undefined}
                >
                  <LogOut className={cn(
                    "h-4 w-4 transition-all duration-300",
                    isOpen ? "mr-2" : "mx-auto"
                  )} />
                  <span className={cn(
                    "transition-all duration-300 whitespace-nowrap",
                    isOpen ? "opacity-100 max-w-full" : "opacity-0 w-0 overflow-hidden"
                  )}>Sign out</span>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
