import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { subDays, subHours } from 'date-fns'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

export interface AuditLog {
    id: string
    action: string
    entity: string
    entityId: string
    userId: string
    role: string
    timestamp: string
    details: string
    status: 'SUCCESS' | 'FAILURE'
}

export interface User {
    id: string
    username: string
    email: string
    role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'
    status: 'ACTIVE' | 'INACTIVE'
    lastLogin?: string
    createdAt: string
}

export function useAuditLogs(filters: any = {}) {
    return useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            if (getUseDummyData()) {
                return Array.from({ length: 20 }).map((_, i) => ({
                    id: `log-${i}`,
                    action: i % 3 === 0 ? 'CREATE' : i % 3 === 1 ? 'UPDATE' : 'DELETE',
                    entity: i % 2 === 0 ? 'Product' : 'Order',
                    entityId: `ent-${100 + i}`,
                    userId: i % 4 === 0 ? 'usr-1' : 'usr-2',
                    role: i % 4 === 0 ? 'ADMIN' : 'OPERATOR',
                    timestamp: subHours(new Date(), i * 2).toISOString(),
                    details: 'Changed stock level from 50 to 45',
                    status: i % 10 === 0 ? 'FAILURE' : 'SUCCESS'
                })) as AuditLog[]
            }
            
            // Build query params
            const params: any = {}
            if (filters.search) {
                // Search can be applied to entityName or action
                // We'll handle this on the backend or filter client-side
            }
            if (filters.action && filters.action !== 'all') {
                params.action = filters.action
            }
            if (filters.entityName) {
                params.entityName = filters.entityName
            }
            if (filters.userId) {
                params.userId = filters.userId
            }
            params.limit = filters.limit || 100
            params.offset = filters.offset || 0
            
            const response = await apiClient.get('/audit-logs', { params })
            const backendData = response.data?.data || response.data
            
            // Transform backend response to frontend format
            if (backendData?.logs && Array.isArray(backendData.logs)) {
                return backendData.logs.map((log: any) => {
                    // Determine status - check if action failed (could be inferred from error in details or default to SUCCESS)
                    // For now, we'll default to SUCCESS unless there's an error indicator
                    const status = 'SUCCESS'

                    // Extract user ID
                    const userId = log.userId || log.createdById || 'system'
                    
                    // Get role - User model might not have role directly, might need to fetch from UserRole
                    // For now, default to USER or check if there's a role field
                    const userRole = log.userRole || 'USER'
                    
                    // Build details from oldValue and newValue
                    let details = `${log.action} ${log.entityName || 'entity'}`
                    try {
                        if (log.oldValue && log.newValue) {
                            const oldVal = typeof log.oldValue === 'string' ? JSON.parse(log.oldValue) : log.oldValue
                            const newVal = typeof log.newValue === 'string' ? JSON.parse(log.newValue) : log.newValue
                            details = `Updated ${log.entityName}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`
                        } else if (log.newValue && !log.oldValue) {
                            const newVal = typeof log.newValue === 'string' ? JSON.parse(log.newValue) : log.newValue
                            details = `Created ${log.entityName}: ${JSON.stringify(newVal)}`
                        } else if (log.oldValue && !log.newValue) {
                            const oldVal = typeof log.oldValue === 'string' ? JSON.parse(log.oldValue) : log.oldValue
                            details = `Deleted ${log.entityName}: ${JSON.stringify(oldVal)}`
                        }
                    } catch (e) {
                        // If JSON parsing fails, use simple description
                        details = `${log.action} ${log.entityName || 'entity'}`
                    }
                    
                    return {
                        id: log.id,
                        action: log.action,
                        entity: log.entityName || 'Unknown',
                        entityId: log.entityId || '',
                        userId: userId,
                        role: userRole,
                        timestamp: log.timestamp,
                        details: details,
                        status: status
                    } as AuditLog
                })
            }
            
            return []
        }
    })
}

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            if (getUseDummyData()) {
                return [
                    { id: 'usr-1', username: 'admin', email: 'admin@factory.com', role: 'ADMIN', status: 'ACTIVE', lastLogin: new Date().toISOString(), createdAt: '2023-01-01' },
                    { id: 'usr-2', username: 'manager', email: 'manager@factory.com', role: 'MANAGER', status: 'ACTIVE', lastLogin: subDays(new Date(), 1).toISOString(), createdAt: '2023-02-15' },
                    { id: 'usr-3', username: 'operator1', email: 'op1@factory.com', role: 'OPERATOR', status: 'ACTIVE', lastLogin: subHours(new Date(), 4).toISOString(), createdAt: '2023-03-20' },
                    { id: 'usr-4', username: 'viewer', email: 'viewer@factory.com', role: 'VIEWER', status: 'INACTIVE', lastLogin: subDays(new Date(), 30).toISOString(), createdAt: '2023-04-10' },
                ] as User[]
            }
            const { data } = await apiClient.get('/system/users')
            return data
        }
    })
}

export function useCreateUser() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: Omit<User, 'id' | 'lastLogin' | 'createdAt'>) => {
            if (getUseDummyData()) {
                return { ...data, id: `usr-${Date.now()}`, lastLogin: null, createdAt: new Date().toISOString() }
            }
            const { data: response } = await apiClient.post('/system/users', data)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User created successfully')
        }
    })
}
