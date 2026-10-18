import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * Active-user dropdown for recruitment selects (interviewer selection).
 *
 * We read `/users/dropdown` directly (rather than the shared `useUsersDropdown`)
 * because that endpoint returns `{ id, firstName, lastName, email }` and we want
 * a correctly composed display name — the shared hook maps a non-existent `name`
 * field and would render blank labels.
 */
export interface RecruitmentUserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function recruitmentUserOptionLabel(option: RecruitmentUserOption): string {
  const fullName = `${option.firstName ?? ''} ${option.lastName ?? ''}`.trim()
  return fullName ? `${fullName} (${option.email})` : option.email
}

export function useRecruitmentUsersDropdown() {
  return useQuery({
    queryKey: ['recruitment', 'users', 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/users/dropdown')
      const responseData = response?.data ?? response
      return (Array.isArray(responseData) ? responseData : []) as RecruitmentUserOption[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
