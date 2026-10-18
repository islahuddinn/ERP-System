'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Check, Loader2, Search, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { usePermissions, type Permission } from '@/hooks/usePermissions'

/**
 * This component renders EXACTLY what GET /permissions returns — there is no
 * hardcoded allow/deny list here. Which modules/permissions are assignable is
 * decided server-side (backend/src/users/permissions/permission-visibility.ts),
 * so the single source of truth stays in one place.
 */

interface PermissionSelectorProps {
    /** Currently-selected permission IDs. */
    selected: Set<string>
    /** Called with the next selection whenever the user toggles a permission or module. */
    onChange: (next: Set<string>) => void
    /** When true, checkboxes are disabled and module "select all" is hidden. */
    readOnly?: boolean
    /** Optional controls rendered on the right of the summary row (e.g. a Save button or a badge). */
    actions?: ReactNode
}

/** One matrix column that maps to a fixed set of action names. */
interface StandardColumn {
    key: string
    label: string
    actions: string[]
}

/**
 * The four classic CRUD columns. Each column claims the first permission in a
 * module whose `action` is one of `actions`. `read`/`view` and `update`/`edit`
 * are treated as synonyms so modules that use either naming land in the right
 * column. Any action that isn't claimed here (manage, approve, receive, …) falls
 * through to the "Other" column.
 */
const STANDARD_COLUMNS: StandardColumn[] = [
    { key: 'create', label: 'Create', actions: ['create'] },
    { key: 'read', label: 'Read', actions: ['read', 'view'] },
    { key: 'update', label: 'Update', actions: ['update', 'edit'] },
    { key: 'delete', label: 'Delete', actions: ['delete'] },
]

/** "purchase-orders" → "Purchase Orders", "assign_manager" → "Assign Manager". */
function toTitleCase(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

interface ModuleRow {
    moduleName: string
    title: string
    ids: string[]
    /** The permission (if any) occupying each standard CRUD column. */
    standard: Record<string, Permission | undefined>
    /** Every permission whose action isn't one of the four CRUD columns. */
    other: Permission[]
}

/**
 * Splits a module's permissions into the four CRUD columns plus an "Other"
 * bucket. A permission is claimed by at most one standard column; anything left
 * unclaimed (including a rare second synonym like both `read` and `view`) is
 * pushed to "Other" so no permission is ever dropped from the grid.
 */
function buildModuleRow(moduleName: string, perms: Permission[]): ModuleRow {
    const claimedIds = new Set<string>()
    const standard: Record<string, Permission | undefined> = {}

    for (const column of STANDARD_COLUMNS) {
        const match = perms.find(
            (permission) => !claimedIds.has(permission.id) && column.actions.includes(permission.action),
        )
        if (match) {
            standard[column.key] = match
            claimedIds.add(match.id)
        }
    }

    const other = perms.filter((permission) => !claimedIds.has(permission.id))

    return {
        moduleName,
        title: toTitleCase(moduleName),
        ids: perms.map((permission) => permission.id),
        standard,
        other,
    }
}

/**
 * A single presentational checkbox rendered as a button. The button IS the click
 * target — we deliberately avoid nesting an interactive checkbox inside another
 * clickable element (which previously threw React into a "Maximum update depth
 * exceeded" loop). `label` is shown for the stacked "Other" chips; the CRUD
 * columns render an icon-only box and rely on `aria-label` for accessibility.
 */
function PermissionCheckbox({
    permission,
    checked,
    readOnly,
    onToggle,
    label,
}: {
    permission: Permission
    checked: boolean
    readOnly: boolean
    onToggle: (permissionId: string) => void
    label?: string
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label ?? permission.name}
            title={permission.description || permission.name}
            disabled={readOnly}
            onClick={() => onToggle(permission.id)}
            className={`inline-flex items-center gap-2 rounded-md outline-none ${
                label ? 'px-2 py-1 text-left' : 'justify-center p-1'
            } ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-green-500'}`}
        >
            <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    checked ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'
                } ${readOnly ? 'opacity-50' : ''}`}
            >
                {checked && <Check className="h-3 w-3" />}
            </span>
            {label && <span className="text-sm text-gray-700">{label}</span>}
        </button>
    )
}

/** Subtle placeholder for a CRUD cell when the module has no such action. */
function EmptyCell() {
    return <span className="text-gray-300 select-none">—</span>
}

/**
 * Controlled permission picker rendered as a classic RBAC matrix: one row per
 * module, columns for Create / Read / Update / Delete, and an "Other" column that
 * stacks every non-CRUD action (manage, approve, receive, …) as labelled chips.
 * Selection state is a `Set` of permission IDs owned by the parent, so this
 * component is reused unchanged both when creating a role (local state) and when
 * editing a role's permissions (saved via PUT).
 */
export function PermissionSelector({ selected, onChange, readOnly = false, actions }: PermissionSelectorProps) {
    const { data: permissionsByModule, isLoading } = usePermissions()
    const [search, setSearch] = useState('')

    // Render exactly what the backend returns — the /permissions endpoint is the
    // single source of truth for which modules/permissions are assignable, so we
    // keep NO hardcoded allow/deny list here. (Non-implemented modules are hidden
    // server-side in permission-visibility.ts.)
    const modules = useMemo(() => {
        if (!permissionsByModule) return []
        return Object.entries(permissionsByModule)
            .filter(([, perms]) => perms.length > 0)
            .sort(([a], [b]) => a.localeCompare(b))
    }, [permissionsByModule])

    const totalPermissions = useMemo(
        () => modules.reduce((sum, [, perms]) => sum + perms.length, 0),
        [modules],
    )

    // Filter by module name, permission name, or description. A module whose NAME
    // matches keeps all its permissions; otherwise only its matching permissions show.
    const visibleModules = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return modules
        return modules
            .map(([moduleName, perms]) => {
                if (moduleName.toLowerCase().includes(query)) return [moduleName, perms] as const
                const matched = perms.filter(
                    (p) =>
                        p.name.toLowerCase().includes(query) ||
                        (p.description ?? '').toLowerCase().includes(query),
                )
                return [moduleName, matched] as const
            })
            .filter(([, perms]) => perms.length > 0)
    }, [modules, search])

    // Pre-split each visible module into its CRUD columns + "Other" bucket.
    const rows = useMemo(
        () => visibleModules.map(([moduleName, perms]) => buildModuleRow(moduleName, perms)),
        [visibleModules],
    )

    // Global select-all / clear-all operates on the permissions currently visible.
    const visibleIds = useMemo(() => rows.flatMap((row) => row.ids), [rows])
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

    // Per-column select-all targets the one permission each module contributes to
    // that CRUD column across every visible row.
    const columnIds = useMemo(() => {
        const map: Record<string, string[]> = {}
        for (const column of STANDARD_COLUMNS) {
            map[column.key] = rows
                .map((row) => row.standard[column.key]?.id)
                .filter((id): id is string => Boolean(id))
        }
        return map
    }, [rows])

    const setSelection = (ids: string[], shouldSelect: boolean) => {
        if (readOnly || ids.length === 0) return
        const next = new Set(selected)
        for (const id of ids) {
            if (shouldSelect) next.add(id)
            else next.delete(id)
        }
        onChange(next)
    }

    const toggleAllVisible = () => setSelection(visibleIds, !allVisibleSelected)

    const togglePermission = (permissionId: string) => {
        if (readOnly) return
        const next = new Set(selected)
        if (next.has(permissionId)) next.delete(permissionId)
        else next.add(permissionId)
        onChange(next)
    }

    const toggleModule = (permissionIds: string[]) => {
        const allSelected = permissionIds.length > 0 && permissionIds.every((id) => selected.has(id))
        setSelection(permissionIds, !allSelected)
    }

    const toggleColumn = (columnKey: string) => {
        const ids = columnIds[columnKey] ?? []
        const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
        setSelection(ids, !allSelected)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Sticky summary + search bar so the selected count, search and actions
                stay reachable while scrolling the long permission grid. Every child
                can shrink (min-w-0) and the rows wrap, so nothing is ever clipped
                past the card edge on narrow widths. */}
            <div className="sticky top-0 z-10 space-y-3 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                        <Shield className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">
                            <span className="font-medium text-gray-900">{selected.size}</span> of {totalPermissions} permissions selected
                        </span>
                    </div>
                    {actions && <div className="shrink-0">{actions}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-0 flex-1 basis-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search modules or permissions…"
                            className="h-10 w-full border-gray-300 pl-9"
                        />
                    </div>
                    {!readOnly && visibleIds.length > 0 && (
                        <button
                            type="button"
                            onClick={toggleAllVisible}
                            className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            {allVisibleSelected ? 'Clear all' : 'Select all'}
                            {search.trim() ? ' shown' : ''}
                        </button>
                    )}
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                    No permissions match “{search.trim()}”.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="text-gray-900 font-semibold">Object Name</TableHead>
                                {STANDARD_COLUMNS.map((column) => {
                                    const ids = columnIds[column.key] ?? []
                                    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
                                    return (
                                        <TableHead key={column.key} className="text-center text-gray-900 font-semibold">
                                            <div className="flex flex-col items-center gap-1">
                                                <span>{column.label}</span>
                                                {!readOnly && ids.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleColumn(column.key)}
                                                        className="text-[11px] font-medium text-green-600 hover:text-green-700"
                                                    >
                                                        {allSelected ? 'Clear' : 'All'}
                                                    </button>
                                                )}
                                            </div>
                                        </TableHead>
                                    )
                                })}
                                <TableHead className="text-gray-900 font-semibold">Other</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const selectedInModule = row.ids.filter((id) => selected.has(id)).length
                                return (
                                    <TableRow key={row.moduleName} className="align-top">
                                        <TableCell className="align-middle">
                                            <div className="font-medium text-gray-900">{row.title}</div>
                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                                                <span>{selectedInModule}/{row.ids.length}</span>
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(row.ids)}
                                                        className="font-medium text-green-600 hover:text-green-700"
                                                    >
                                                        {selectedInModule === row.ids.length ? 'Clear all' : 'Select all'}
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>

                                        {STANDARD_COLUMNS.map((column) => {
                                            const permission = row.standard[column.key]
                                            return (
                                                <TableCell key={column.key} className="text-center align-middle">
                                                    {permission ? (
                                                        <PermissionCheckbox
                                                            permission={permission}
                                                            checked={selected.has(permission.id)}
                                                            readOnly={readOnly}
                                                            onToggle={togglePermission}
                                                        />
                                                    ) : (
                                                        <EmptyCell />
                                                    )}
                                                </TableCell>
                                            )
                                        })}

                                        <TableCell className="align-middle">
                                            {row.other.length === 0 ? (
                                                <EmptyCell />
                                            ) : (
                                                <div className="flex flex-col items-start gap-1">
                                                    {row.other.map((permission) => (
                                                        <PermissionCheckbox
                                                            key={permission.id}
                                                            permission={permission}
                                                            checked={selected.has(permission.id)}
                                                            readOnly={readOnly}
                                                            onToggle={togglePermission}
                                                            label={toTitleCase(permission.action)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
