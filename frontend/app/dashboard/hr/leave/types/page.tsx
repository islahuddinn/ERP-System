"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LegacyLeaveTypesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/hr/leave")
  }, [router])

  return null
}
