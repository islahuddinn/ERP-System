'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// The Roles module now lives at /dashboard/settings/roles-permissions (the
// sidebar-linked route). This legacy path redirects there so old bookmarks and
// in-app links keep working.
export default function RolesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/settings/roles-permissions')
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  )
}
