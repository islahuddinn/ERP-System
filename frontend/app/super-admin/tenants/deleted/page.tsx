'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, CheckCircle, Mail, Phone, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDeletedTenants, useRestoreTenant, useHardDeleteTenant, Tenant } from '@/hooks/useSuperAdmin'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DeletedTenantsPage() {
	const router = useRouter()
	const [currentPage, setCurrentPage] = useState(1)

	const { data, isLoading, refetch } = useDeletedTenants({ page: currentPage, limit: 10 })
	const restoreTenant = useRestoreTenant()
	const hardDeleteTenant = useHardDeleteTenant()
	const [confirmHardDelete, setConfirmHardDelete] = useState<{ id: string; name: string } | null>(null)
	const [hardDeleteText, setHardDeleteText] = useState('')

	const tenants = data?.data || []
	const totalPages = data?.meta?.totalPages || 1

	const handleRestore = async (id: string) => {
		await restoreTenant.mutateAsync(id)
		refetch()
	}

	const handlePermanentDelete = (tenant: Tenant) => {
		setConfirmHardDelete({ id: tenant.id, name: tenant.name })
		setHardDeleteText('')
	}

	return (
		<>
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button variant="ghost" onClick={() => router.push('/super-admin/tenants')}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<h1 className="text-3xl font-bold text-gray-900">Deleted Tenants</h1>
				</div>
				<Badge className="bg-red-100 text-red-700 border-red-200">
					<AlertTriangle className="h-3 w-3 mr-1" />
					Use restore to bring a tenant back
				</Badge>
			</div>

			<Card className="factory-light-card">
				<CardHeader>
					<CardTitle className="text-gray-900">Soft-deleted Tenants</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-8 text-gray-600">Loading...</div>
					) : tenants.length === 0 ? (
						<div className="text-center py-8 text-gray-600">No deleted tenants</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="border-gray-200">
											<TableHead className="text-gray-700">Name</TableHead>
											<TableHead className="text-gray-700">Email</TableHead>
											<TableHead className="text-gray-700">Deleted On</TableHead>
											<TableHead className="text-right text-gray-700">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tenants.map((tenant: any) => (
											<TableRow key={tenant.id} className="border-gray-200 hover:bg-gray-50">
												<TableCell className="text-gray-900">{tenant.name}</TableCell>
												<TableCell>
													<div className="flex items-center space-x-2">
														<Mail className="h-4 w-4 text-gray-500" />
														<span className="text-gray-700">{tenant.email}</span>
													</div>
													{tenant.phone && (
														<div className="flex items-center space-x-2 mt-1">
															<Phone className="h-4 w-4 text-gray-500" />
															<span className="text-sm text-gray-600">{tenant.phone}</span>
														</div>
													)}
												</TableCell>
												<TableCell className="text-gray-600 text-sm">
													{tenant.deletedAt ? format(new Date(tenant.deletedAt), 'MMM dd, yyyy') : '-'}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex items-center justify-end gap-2">
														<Button
															variant="ghost"
															size="sm"
															title="Restore tenant"
															aria-label="Restore tenant"
															onClick={() => handleRestore(tenant.id)}
														>
															<RotateCcw className="h-4 w-4 text-green-400" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															title="Hard delete tenant (wipe data)"
															aria-label="Hard delete tenant"
															onClick={() => handlePermanentDelete(tenant)}
														>
															<Trash2 className="h-4 w-4 text-red-500" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							{totalPages > 1 && (
								<div className="flex items-center justify-between mt-4">
									<Button
										variant="outline"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
									>
										Previous
									</Button>
									<span className="text-sm text-gray-600">
										Page {currentPage} of {totalPages}
									</span>
									<Button
										variant="outline"
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
									>
										Next
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>

		{/* Confirm Hard Delete */}
		<Dialog open={!!confirmHardDelete} onOpenChange={(open) => !open && setConfirmHardDelete(null)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Permanent Delete Tenant</DialogTitle>
					<DialogDescription>
						This will attempt to wipe all data in the tenant&apos;s database and remove it from the master database.
						If the database is unreachable, the tenant will still be removed from the master database.
						Type DELETE to confirm.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<Label>Type DELETE to confirm</Label>
					<Input value={hardDeleteText} onChange={(e) => setHardDeleteText(e.target.value)} />
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setConfirmHardDelete(null)}>
						Cancel
					</Button>
					<Button
						className="bg-red-600 hover:bg-red-700"
						disabled={hardDeleteText !== 'DELETE' || !confirmHardDelete}
						onClick={async () => {
							if (!confirmHardDelete) return
							try {
								await hardDeleteTenant.mutateAsync(confirmHardDelete.id)
								toast.success('Tenant permanently deleted')
								refetch()
							} finally {
								setConfirmHardDelete(null)
								setHardDeleteText('')
							}
						}}
					>
						Permanently Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	)
}


