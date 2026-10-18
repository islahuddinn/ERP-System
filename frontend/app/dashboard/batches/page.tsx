import { redirect } from 'next/navigation'

/** Legacy route — raw material batches (from GRN) live under Raw Materials. */
export default function BatchesRedirectPage() {
  redirect('/dashboard/raw-materials/batches')
}
