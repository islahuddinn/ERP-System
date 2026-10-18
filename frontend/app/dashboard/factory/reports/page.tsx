'use client'

import { useRouter } from 'next/navigation'
import {
    FileText,
    Factory,
    Package,
    AlertTriangle,
    Trash2,
    Warehouse,
    ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const reportCategories = [
    {
        title: 'Production Reports',
        description: 'Daily output, efficiency, and downtime logs.',
        icon: Factory,
        href: '/dashboard/factory/reports/production',
        color: 'text-blue-600',
        bg: 'bg-blue-100'
    },
    {
        title: 'Material Usage',
        description: 'Raw material consumption and yield analysis.',
        icon: Package,
        href: '/dashboard/factory/reports/material',
        color: 'text-green-600',
        bg: 'bg-green-100'
    },
    {
        title: 'Quality Control',
        description: 'Inspection results, defect rates, and compliance.',
        icon: AlertTriangle,
        href: '/dashboard/factory/reports/quality',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100'
    },
    {
        title: 'Waste Management',
        description: 'Waste generation by type and disposal logs.',
        icon: Trash2,
        href: '/dashboard/factory/reports/waste',
        color: 'text-red-600',
        bg: 'bg-red-100'
    },
    {
        title: 'Warehouse Status',
        description: 'Stock levels, capacity utilization, and movements.',
        icon: Warehouse,
        href: '/dashboard/factory/reports/warehouse',
        color: 'text-purple-600',
        bg: 'bg-purple-100'
    },
]

export default function FactoryReportsPage() {
    const router = useRouter()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Factory Reports</h2>
                <p className="text-gray-500">Centralized hub for all manufacturing and operational reports.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reportCategories.map((cat) => (
                    <Card key={cat.title} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(cat.href)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className={`p-2 rounded-lg ${cat.bg}`}>
                                <cat.icon className={`h-6 w-6 ${cat.color}`} />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-gray-900">{cat.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="mb-4">{cat.description}</CardDescription>
                            <Button variant="ghost" className="w-full justify-between hover:bg-gray-50 text-gray-600 group">
                                View Reports
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
