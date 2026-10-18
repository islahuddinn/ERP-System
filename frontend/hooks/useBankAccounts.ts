import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * Bank Accounts hooks — reusable for both suppliers and customers.
 *
 * Endpoints are nested and identical in shape:
 *   /suppliers/:ownerId/bank-accounts
 *   /customers/:ownerId/bank-accounts
 *
 * Ownership is enforced by URL (never sent in the body).
 * See docs/api/bank-accounts-api.md for the full contract.
 */

export type BankAccountOwnerType = 'suppliers' | 'customers'

export interface BankAccount {
    id: string
    supplierId?: string
    customerId?: string
    bankName: string
    accountTitle: string
    accountNumber: string
    iban?: string | null
    swiftCode?: string | null
    currency: string
    isDefault: boolean
    isActive: boolean
    deletedAt?: string | null
    createdAt: string
    updatedAt: string
}

export interface CreateBankAccountDto {
    bankName: string
    accountTitle: string
    accountNumber: string
    iban?: string
    swiftCode?: string
    currency?: string
    isDefault?: boolean
    isActive?: boolean
}

export type UpdateBankAccountDto = Partial<CreateBankAccountDto>

const bankAccountsBase = (ownerType: BankAccountOwnerType, ownerId: string) =>
    `/${ownerType}/${ownerId}/bank-accounts`

// The backend wraps responses as { success, message, data }. Unwrap defensively.
const unwrap = <T>(payload: any): T => (payload?.data ?? payload) as T

export function useBankAccounts(ownerType: BankAccountOwnerType, ownerId: string) {
    return useQuery({
        queryKey: ['bank-accounts', ownerType, ownerId],
        queryFn: async () => {
            if (!ownerId) throw new Error('Owner ID is required')
            const { data } = await apiClient.get(bankAccountsBase(ownerType, ownerId))
            return unwrap<BankAccount[]>(data) || []
        },
        enabled: !!ownerId,
    })
}

export function useCreateBankAccount(ownerType: BankAccountOwnerType, ownerId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (dto: CreateBankAccountDto) => {
            const { data } = await apiClient.post(bankAccountsBase(ownerType, ownerId), dto)
            return unwrap<BankAccount>(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts', ownerType, ownerId] })
        },
    })
}

export function useUpdateBankAccount(ownerType: BankAccountOwnerType, ownerId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ bankAccountId, dto }: { bankAccountId: string; dto: UpdateBankAccountDto }) => {
            const { data } = await apiClient.patch(`${bankAccountsBase(ownerType, ownerId)}/${bankAccountId}`, dto)
            return unwrap<BankAccount>(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts', ownerType, ownerId] })
        },
    })
}

export function useSetDefaultBankAccount(ownerType: BankAccountOwnerType, ownerId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (bankAccountId: string) => {
            const { data } = await apiClient.patch(
                `${bankAccountsBase(ownerType, ownerId)}/${bankAccountId}/set-default`,
            )
            return unwrap<BankAccount>(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts', ownerType, ownerId] })
        },
    })
}

export function useDeleteBankAccount(ownerType: BankAccountOwnerType, ownerId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (bankAccountId: string) => {
            await apiClient.delete(`${bankAccountsBase(ownerType, ownerId)}/${bankAccountId}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts', ownerType, ownerId] })
        },
    })
}
