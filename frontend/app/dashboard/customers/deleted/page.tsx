'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info, Trash2 } from 'lucide-react'

/**
 * Soft-deleted customers are retained for historical records but, per the
 * refactored Customers API, do NOT appear in any list, dropdown, or overview
 * endpoint, and there is no restore / permanent-delete flow. This page is
 * therefore informational only.
 */
export default function DeletedCustomersPage() {
  const router = useRouter()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/dashboard/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trash2 className="h-7 w-7 text-gray-500" />
            Deleted Customers
          </h1>
          <p className="text-gray-500">Soft-deleted customer records</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Info className="h-5 w-5 text-blue-500" />
            Not available
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            Customers are soft-deleted &mdash; their <code>deletedAt</code> field is set and
            <code> isActive</code> becomes <code>false</code>. The data is retained for historical
            records (sales, ledger, audit), but soft-deleted customers no longer appear in any list,
            dropdown, or ledger-overview endpoint, and the current API does not expose a restore or
            permanent-delete flow.
          </p>
          <p>
            A customer&apos;s balance must be exactly <strong>0</strong> before it can be deleted, so
            no outstanding dues are ever lost.
          </p>
          <Button
            variant="outline"
            className="border-gray-300"
            onClick={() => router.push('/dashboard/customers')}
          >
            Go to Customers
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
