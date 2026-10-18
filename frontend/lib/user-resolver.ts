import { apiClient } from './api-client'

interface User {
  id: string
  firstName?: string
  lastName?: string
  /** Legacy single-name field (pre-RBAC users). */
  name?: string
  email: string
  role?: unknown
  status?: string
}

class UserResolver {
  private userMap = new Map<string, User>()
  private loaded = false
  private loadingPromise: Promise<void> | null = null

  async loadUsers(): Promise<void> {
    if (this.loaded) return
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = this._loadUsers()
    await this.loadingPromise
    this.loadingPromise = null
  }

  private async _loadUsers(): Promise<void> {
    try {
      // Fetch a large page so every referenced user (approvers, creators, etc.)
      // resolves — the default paginated response only returns the first ~10.
      const res = await apiClient.get('/users?limit=1000')
      const users = res.data?.data || res.data || []
      
      this.userMap.clear()
      users.forEach((user: User) => {
        this.userMap.set(user.id, user)
      })
      
      this.loaded = true
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  getUser(id: string): User | undefined {
    return this.userMap.get(id)
  }

  getUserName(id: string): string {
    const user = this.userMap.get(id)
    if (!user) return 'Unknown'
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return fullName || user.name || user.email || 'Unknown'
  }

  getUserEmail(id: string): string {
    return this.userMap.get(id)?.email || ''
  }

  getUserRole(id: string): string {
    const role = this.userMap.get(id)?.role
    if (!role) return ''
    if (typeof role === 'string') return role
    if (typeof role === 'object' && role && 'name' in role) {
      return String((role as { name?: unknown }).name ?? '')
    }
    return ''
  }

  invalidate(): void {
    this.loaded = false
    this.userMap.clear()
  }
}

export const userResolver = new UserResolver()
