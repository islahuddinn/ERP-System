import { redirect } from 'next/navigation'

export default function BatchesExpiringRedirectPage() {
  redirect('/dashboard/raw-materials/batches')
}
