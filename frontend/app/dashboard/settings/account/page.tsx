'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    Lock,
    Save,
    Image as ImageIcon,
    X,
    Upload,
    User as UserIcon,
    ShieldCheck,
    Pencil,
    Eye,
    EyeOff,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { useBranding, useUpdateBranding } from '@/hooks/useBranding'

// ── Types for the current-user profile (GET /users/me) ──────────────────────
interface CurrentUserProfile {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    roleId: string | null
    loginAccess: 'ENABLED' | 'DISABLED' | 'SUSPENDED'
    role?: { id: string; name: string } | null
    employee?: {
        employeeCode?: string | null
        contracts?: Array<{
            department?: { name?: string | null } | null
            position?: { title?: string | null } | null
        }>
    } | null
}

// Response envelopes from this backend are wrapped as { data: ... } by the
// global ResponseInterceptor; unwrap defensively so both shapes work.
const unwrap = <T,>(body: any): T => (body?.data ?? body) as T

// Human-friendly module label from a permission name like "raw-material.view".
const toModuleLabel = (module: string): string =>
    module
        .replace(/[-_.]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

// Human-friendly action label from the tail of a permission name.
const toActionLabel = (action: string): string =>
    action.replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const loginAccessStyles: Record<string, string> = {
    ENABLED: 'bg-green-100 text-green-700 border-green-200',
    DISABLED: 'bg-gray-100 text-gray-600 border-gray-200',
    SUSPENDED: 'bg-amber-100 text-amber-700 border-amber-200',
}

// A password field with a show/hide toggle (QA #16 parity on this screen).
function PasswordField({
    id,
    label,
    value,
    onChange,
    placeholder,
}: {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
}) {
    const [visible, setVisible] = useState(false)
    return (
        <div>
            <Label htmlFor={id} className="text-gray-700 font-medium">
                {label}
            </Label>
            <div className="relative mt-1.5">
                <Input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-11 border-gray-300 bg-white pr-11"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}

export default function AccountSettingsPage() {
    const queryClient = useQueryClient()

    // ── Current user profile (QA #5) ────────────────────────────────────────
    const {
        data: profile,
        isLoading: isLoadingProfile,
        isError: isProfileError,
    } = useQuery<CurrentUserProfile>({
        queryKey: ['current-user', 'profile'],
        queryFn: async () => {
            const { data } = await apiClient.get('/users/me')
            return unwrap<CurrentUserProfile>(data)
        },
    })

    // ── Current user permissions (QA #8) ────────────────────────────────────
    // The backend always returns permissions grouped by module
    // (`{ products: ["products.read", ...] }`), never a flat array — flatten it
    // the same way auth-service.ts does, otherwise this table was silently
    // always empty (Array.isArray on an object is false).
    const { data: permissionNames = [], isLoading: isLoadingPermissions } = useQuery<string[]>({
        queryKey: ['current-user', 'permissions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/users/me/permissions')
            const payload = unwrap<{ permissions?: Record<string, string[]> }>(data)
            const grouped = payload?.permissions
            if (!grouped || typeof grouped !== 'object' || Array.isArray(grouped)) return []
            return Object.values(grouped).flat().filter((p): p is string => typeof p === 'string')
        },
    })

    // Group permission names ("module.action") by module for readable display.
    // We render exactly what /users/me/permissions returns — the backend already
    // excludes non-implemented modules/keys (see getVisiblePermissionsByRoleId…),
    // so there is no client-side allow/deny list here.
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, string[]> = {}
        for (const name of permissionNames) {
            const separatorIndex = name.indexOf('.')
            const moduleName = separatorIndex === -1 ? name : name.slice(0, separatorIndex)
            const action = separatorIndex === -1 ? name : name.slice(separatorIndex + 1)
            if (!groups[moduleName]) groups[moduleName] = []
            groups[moduleName].push(action)
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    }, [permissionNames])

    // ── Profile edit form (QA #6) ───────────────────────────────────────────
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    })
    // Field-specific validation errors (#19, #20) — a combined "First Name and
    // Last Name are required" message was shown even when only one was empty.
    const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof typeof profileForm, string>>>({})
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // Matches the same phone shape validated server-side for employees (#21).
    const PHONE_RE = /^[0-9+\-()\s]{7,20}$/

    // Keep the edit form in sync whenever the profile loads/refreshes and we are
    // not actively editing (avoids clobbering in-progress edits).
    useEffect(() => {
        if (profile && !isEditingProfile) {
            setProfileForm({
                firstName: profile.firstName ?? '',
                lastName: profile.lastName ?? '',
                email: profile.email ?? '',
                phone: profile.phone ?? '',
            })
        }
    }, [profile, isEditingProfile])

    const updateProfileMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.patch('/users/me', {
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                email: profileForm.email,
                phone: profileForm.phone || null,
            })
            return unwrap<CurrentUserProfile>(data)
        },
        onSuccess: () => {
            toast.success('Profile updated successfully')
            setIsEditingProfile(false)
            queryClient.invalidateQueries({ queryKey: ['current-user'] })
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to update profile'))
        },
    })

    const handleSaveProfile = () => {
        const errors: Partial<Record<keyof typeof profileForm, string>> = {}

        if (!profileForm.firstName.trim()) errors.firstName = 'First Name is required'
        if (!profileForm.lastName.trim()) errors.lastName = 'Last Name is required'
        if (!profileForm.email.trim()) {
            errors.email = 'Email is required'
        } else if (!EMAIL_RE.test(profileForm.email.trim())) {
            errors.email = 'Enter a valid email address'
        }
        if (profileForm.phone.trim() && !PHONE_RE.test(profileForm.phone.trim())) {
            errors.phone = 'Enter a valid phone number'
        }

        setProfileErrors(errors)
        if (Object.keys(errors).length > 0) return

        updateProfileMutation.mutate()
    }

    const handleCancelProfileEdit = () => {
        if (profile) {
            setProfileForm({
                firstName: profile.firstName ?? '',
                lastName: profile.lastName ?? '',
                email: profile.email ?? '',
                phone: profile.phone ?? '',
            })
        }
        setProfileErrors({})
        setIsEditingProfile(false)
    }

    // ── Branding (QA #22, #23, #24) ──────────────────────────────────────────
    // Previously this section only held local component state and never called
    // any API — Save just faked a success toast after a setTimeout, so nothing
    // ever persisted and the sidebar logo never updated. Wired to the real
    // GET/PATCH /auth/branding endpoints (now that the backend actually
    // implements them) via the existing useBranding/useUpdateBranding hooks,
    // which the sidebar already reads from the same query cache — so a saved
    // logo/name now updates the top-left nav immediately (#23) and survives a
    // refresh (#22, #24).
    const { data: branding, isLoading: isLoadingBranding } = useBranding()
    const updateBrandingMutation = useUpdateBranding()
    const [displayName, setDisplayName] = useState('')
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [isDisplayNameDirty, setIsDisplayNameDirty] = useState(false)

    // Sync the input from the server value on load and after a successful save —
    // but not while the user is actively mid-edit, so a background refetch never
    // clobbers an in-progress keystroke.
    useEffect(() => {
        if (branding && !isDisplayNameDirty) {
            setDisplayName(branding.name)
        }
    }, [branding, isDisplayNameDirty])

    // ── Change password (QA #7) ─────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('File size must be less than 2MB')
                return
            }
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                toast.error('Only PNG, JPG, and WEBP files are allowed')
                return
            }
            setLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleResetBranding = () => {
        setDisplayName(branding?.name ?? '')
        setIsDisplayNameDirty(false)
        setLogoFile(null)
        setLogoPreview(null)
    }

    const handleSaveBranding = async () => {
        if (!displayName.trim()) {
            toast.error('Display name is required')
            return
        }
        await updateBrandingMutation.mutateAsync({
            brandingName: displayName.trim(),
            logoFile: logoFile ?? undefined,
        })
        setIsDisplayNameDirty(false)
        setLogoFile(null)
        setLogoPreview(null)
    }

    const handleClearPassword = () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.put('/users/me/password', {
                currentPassword,
                newPassword,
            })
            return data
        },
        onSuccess: () => {
            toast.success('Password changed successfully')
            handleClearPassword()
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to change password'))
        },
    })

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('All password fields are required')
            return
        }
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('New password and confirmation do not match')
            return
        }
        // Mirror the backend guard (QA #15) so users get instant feedback.
        if (newPassword === currentPassword) {
            toast.error('New password must be different from the current password')
            return
        }
        changePasswordMutation.mutate()
    }

    const activeContract = profile?.employee?.contracts?.[0]

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-green-100 rounded-lg">
                    <Lock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Account Settings</h2>
                    <p className="text-gray-500">Manage your profile, permissions, and security settings</p>
                </div>
            </div>

            <div className="max-w-3xl space-y-6">
                {/* My Profile Section (QA #5, #6) */}
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-green-600" />
                                <CardTitle className="text-gray-900">My Profile</CardTitle>
                            </div>
                            {!isEditingProfile && profile && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditingProfile(true)}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            )}
                        </div>
                        <CardDescription>Your personal details and account status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoadingProfile && <p className="text-sm text-gray-500">Loading profile…</p>}

                        {isProfileError && (
                            <p className="text-sm text-red-600">
                                Unable to load your profile. Please refresh the page.
                            </p>
                        )}

                        {profile && !isEditingProfile && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ProfileField label="First Name" value={profile.firstName} />
                                <ProfileField label="Last Name" value={profile.lastName} />
                                <ProfileField label="Email" value={profile.email} />
                                <ProfileField label="Phone" value={profile.phone} />
                                <ProfileField
                                    label="Role"
                                    value={profile.role?.name ?? profile.roleId ?? '—'}
                                />
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Login Access</p>
                                    <Badge
                                        variant="outline"
                                        className={`mt-1 ${loginAccessStyles[profile.loginAccess] ?? ''}`}
                                    >
                                        {profile.loginAccess}
                                    </Badge>
                                </div>
                                {profile.employee?.employeeCode && (
                                    <ProfileField
                                        label="Employee Code"
                                        value={profile.employee.employeeCode}
                                    />
                                )}
                                {activeContract?.department?.name && (
                                    <ProfileField
                                        label="Department"
                                        value={activeContract.department.name}
                                    />
                                )}
                                {activeContract?.position?.title && (
                                    <ProfileField
                                        label="Position"
                                        value={activeContract.position.title}
                                    />
                                )}
                            </div>
                        )}

                        {profile && isEditingProfile && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="firstName" className="text-gray-700 font-medium">
                                            First Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="firstName"
                                            value={profileForm.firstName}
                                            onChange={(e) => {
                                                setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                                                setProfileErrors((errs) => ({ ...errs, firstName: undefined }))
                                            }}
                                            className="mt-1.5 h-11 border-gray-300 bg-white"
                                        />
                                        {profileErrors.firstName && (
                                            <p className="text-sm text-red-600 mt-1">{profileErrors.firstName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="lastName" className="text-gray-700 font-medium">
                                            Last Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="lastName"
                                            value={profileForm.lastName}
                                            onChange={(e) => {
                                                setProfileForm((f) => ({ ...f, lastName: e.target.value }))
                                                setProfileErrors((errs) => ({ ...errs, lastName: undefined }))
                                            }}
                                            className="mt-1.5 h-11 border-gray-300 bg-white"
                                        />
                                        {profileErrors.lastName && (
                                            <p className="text-sm text-red-600 mt-1">{profileErrors.lastName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-gray-700 font-medium">
                                            Email <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(e) => {
                                                setProfileForm((f) => ({ ...f, email: e.target.value }))
                                                setProfileErrors((errs) => ({ ...errs, email: undefined }))
                                            }}
                                            className="mt-1.5 h-11 border-gray-300 bg-white"
                                        />
                                        {profileErrors.email && (
                                            <p className="text-sm text-red-600 mt-1">{profileErrors.email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="phone" className="text-gray-700 font-medium">
                                            Phone
                                        </Label>
                                        <Input
                                            id="phone"
                                            value={profileForm.phone}
                                            onChange={(e) => {
                                                setProfileForm((f) => ({ ...f, phone: e.target.value }))
                                                setProfileErrors((errs) => ({ ...errs, phone: undefined }))
                                            }}
                                            className="mt-1.5 h-11 border-gray-300 bg-white"
                                        />
                                        {profileErrors.phone && (
                                            <p className="text-sm text-red-600 mt-1">{profileErrors.phone}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCancelProfileEdit}
                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSaveProfile}
                                        disabled={updateProfileMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                                    >
                                        {updateProfileMutation.isPending ? (
                                            <>Saving...</>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Profile
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Permissions Section (QA #8) */}
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-gray-900">My Permissions</CardTitle>
                        </div>
                        <CardDescription>
                            Access granted to you, grouped by module
                            {profile?.role?.name ? ` (via the ${profile.role.name} role)` : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingPermissions && (
                            <p className="text-sm text-gray-500">Loading permissions…</p>
                        )}

                        {!isLoadingPermissions && groupedPermissions.length === 0 && (
                            <p className="text-sm text-gray-500">
                                No permissions have been assigned to your account.
                            </p>
                        )}

                        {/* Table view (#17) — module + every granted action listed as its own
                            row, rather than badges grouped by module, for easier scanning
                            and comparison of exactly what's granted. */}
                        {groupedPermissions.length > 0 && (
                            // One row PER MODULE — the granted actions render as badges on a
                            // single line that scrolls horizontally when a module has many, so
                            // the list stays short vertically instead of one row per permission.
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-44">Module</TableHead>
                                            <TableHead>Granted Permissions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedPermissions.map(([moduleName, actions]) => (
                                            <TableRow key={moduleName}>
                                                <TableCell className="align-middle font-semibold text-gray-900 whitespace-nowrap">
                                                    {toModuleLabel(moduleName)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                                                        {actions.map((action) => (
                                                            <Badge
                                                                key={action}
                                                                variant="outline"
                                                                className="shrink-0 bg-green-50 text-green-700 border-green-200 font-normal"
                                                            >
                                                                {toActionLabel(action)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Change Password Section (QA #7) */}
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-gray-900">Change Password</CardTitle>
                        </div>
                        <CardDescription>Update your account password for enhanced security</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <PasswordField
                                id="currentPassword"
                                label="Current Password"
                                value={currentPassword}
                                onChange={setCurrentPassword}
                                placeholder="Enter current password"
                            />
                            <PasswordField
                                id="newPassword"
                                label="New Password"
                                value={newPassword}
                                onChange={setNewPassword}
                                placeholder="Enter new password (min 8 characters)"
                            />
                            <PasswordField
                                id="confirmPassword"
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                placeholder="Confirm new password"
                            />

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClearPassword}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        changePasswordMutation.isPending ||
                                        !currentPassword ||
                                        !newPassword ||
                                        !confirmPassword
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                                >
                                    {changePasswordMutation.isPending ? (
                                        <>Updating...</>
                                    ) : (
                                        <>
                                            <Lock className="mr-2 h-4 w-4" />
                                            Update Password
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Branding Section (existing) */}
                <Card className="bg-white shadow-sm border-gray-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-gray-900">Branding</CardTitle>
                        </div>
                        <CardDescription>Customize your account display name and logo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="displayName" className="text-gray-700 font-medium">
                                Display Name
                            </Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => {
                                    setDisplayName(e.target.value)
                                    setIsDisplayNameDirty(true)
                                }}
                                placeholder="e.g., Malind Tech"
                                disabled={isLoadingBranding}
                                className="mt-1.5 h-11 border-gray-300 bg-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Shown in the sidebar and dashboard welcome message
                            </p>
                        </div>

                        <div>
                            <Label className="text-gray-700 font-medium">Logo</Label>
                            <div className="mt-3 flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Logo preview"
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <img
                                                src={branding?.logoUrl || '/images/logo.png'}
                                                alt="Current logo"
                                                className="w-full h-full object-contain p-2"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="logo"
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                        <Label
                                            htmlFor="logo"
                                            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Choose File
                                        </Label>
                                        {logoFile && (
                                            <span className="text-sm text-gray-600">{logoFile.name}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        PNG, JPG, or WEBP. Max 2 MB. For the sharpest display, upload a square logo at least 256×256 pixels.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetBranding}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                            <Button
                                onClick={handleSaveBranding}
                                disabled={updateBrandingMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                            >
                                {updateBrandingMutation.isPending ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Branding
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Read-only labelled value used across the profile view.
function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-sm text-gray-900">{value?.toString().trim() || '—'}</p>
        </div>
    )
}
