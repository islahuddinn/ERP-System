'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionSelector } from '@/components/hr/roles/permission-selector'
import { useAssignRolePermissions, type Role } from '@/hooks/useRoles'

interface PermissionMatrixProps {
    role: Role
}

/**
 * Grouped permission matrix for an existing role. Seeds the selection from the
 * role's currently-assigned permissions and saves the full selection via
 * PUT /roles/:roleId/permissions. On a successful save the user is returned to
 * the Role List.
 *
 * System roles are shown read-only — the backend manages their permissions and
 * rejects modifications, so we never let the user submit a change that would fail.
 */
export function PermissionMatrix({ role }: PermissionMatrixProps) {
    const router = useRouter()
    const assignMutation = useAssignRolePermissions()

    const readOnly = role.isSystem

    const assignedIds = useMemo(
        () => role.rolePermissions.map((rp) => rp.permissionId),
        [role.rolePermissions],
    )

    const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))

    // Re-sync local selection whenever the role's saved permissions change
    // (e.g. after a successful save re-fetches the role).
    useEffect(() => {
        setSelected(new Set(assignedIds))
    }, [assignedIds])

    const isDirty = useMemo(() => {
        if (selected.size !== assignedIds.length) return true
        return assignedIds.some((id) => !selected.has(id))
    }, [selected, assignedIds])

    const handleSave = async () => {
        await assignMutation.mutateAsync({ roleId: role.id, permissionIds: [...selected] })
        router.push('/dashboard/settings/roles-permissions')
    }

    const actions = readOnly ? (
        <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" /> System role — read only
        </Badge>
    ) : (
        <Button
            onClick={handleSave}
            disabled={assignMutation.isPending || !isDirty}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
        >
            {assignMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
                <><Save className="mr-2 h-4 w-4" />Save Permissions</>
            )}
        </Button>
    )

    return (
        <PermissionSelector
            selected={selected}
            onChange={setSelected}
            readOnly={readOnly}
            actions={actions}
        />
    )
}
