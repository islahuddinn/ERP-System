"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LegacyRostersRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/hr/attendance")
  }, [router])

  return null
}
