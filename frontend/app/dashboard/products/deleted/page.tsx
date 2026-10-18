'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DeletedProductsPage() {
  const router = useRouter()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Deleted Products</h2>
          <p className="text-gray-500">This feature is no longer available. Products use soft-delete via the isActive toggle.</p>
        </div>
      </div>
    </div>
  )
}
