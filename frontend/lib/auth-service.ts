/**
 * Authentication Service
 * Direct JWT authentication with backend (no NextAuth)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  tenantId: string;
  role?: "ADMIN" | "STAFF";
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  /** Legacy display name from pre-RBAC login responses. */
  name?: string;
  email: string;
  /** Legacy role string — no longer returned by the RBAC login response. */
  role?: string;
  loginAccess?: string;
  /** No longer part of the login `user`; resolved from the login form / localStorage. */
  tenantId?: string;
  branding?: {
    name: string;
    logoUrl: string | null;
    logoId: string | null;
    updatedAt: string | null;
  };
}

export interface LoginResponse {
  access_token: string;
  user: User;
  // Module → permission-name[] map the backend returns on login (drives tab/route gating).
  permissions?: Record<string, string[]>;
}

export interface AuthError {
  statusCode: number;
  message: string;
  error: string;
}

class AuthService {
  private readonly TOKEN_KEY = "access_token";
  private readonly USER_KEY = "user";
  private readonly TENANT_ID_KEY = "tenantId";
  private readonly PERMISSIONS_KEY = "permissions";

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Try to parse error response
        try {
          const error: AuthError = await response.json();
          throw new Error(error.message || "Registration failed");
        } catch (parseError) {
          // If response is not JSON, use status text
          throw new Error(`Registration failed: ${response.statusText || "Unknown error"}`);
        }
      }

      const responseData = await response.json();

      // Handle wrapped response from ResponseInterceptor
      // Response format: { success: true, message: string, data: User }
      const user = responseData.data || responseData;

      if (!user || !user.id) {
        throw new Error("Invalid response: user data missing");
      }

      return user;
    } catch (error: any) {
      // Handle network errors (backend not running, CORS, etc.)
      if (error.name === "TypeError" && /fetch/i.test(error.message)) {
        throw new Error(
          `Cannot reach the API at ${API_BASE_URL}. ` +
            `Open ${API_BASE_URL}/health in a browser (it should return status ok). ` +
            `If that works, set CORS_ORIGIN or FRONTEND_URL on the backend to this site's origin with no trailing slash.`,
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        // Try to parse error response
        try {
          const error: AuthError = await response.json();
          throw new Error(error.message || "Login failed");
        } catch (parseError) {
          // If response is not JSON, use status text
          throw new Error(`Login failed: ${response.statusText || "Unknown error"}`);
        }
      }

      const responseData = await response.json();

      // Handle wrapped response from ResponseInterceptor
      // Response format: { success: true, message: string, data: { access_token, user } }
      const data = responseData.data || responseData;

      // Validate response structure
      if (!data.access_token) {
        throw new Error("Invalid response: access_token missing");
      }

      if (!data.user) {
        throw new Error("Invalid response: user data missing");
      }

      // The login response `user` no longer carries `tenantId` (the backend now
      // returns a trimmed user: id/firstName/lastName/email/loginAccess). Fall back
      // to the tenant the user entered on the login form.
      const tenantId = data.user.tenantId || credentials.tenantId;
      if (!tenantId) {
        throw new Error("Invalid response: tenantId missing");
      }

      // Store token and user info
      this.setToken(data.access_token);
      this.setUser(data.user);
      this.setTenantId(tenantId);
      // Persist the module→permissions map from the login response so tab/route
      // gating works immediately (and after reloads) without a separate fetch.
      this.setPermissions(data.permissions);

      return data;
    } catch (error: any) {
      // Handle network errors (backend not running, CORS, etc.)
      if (error.name === "TypeError" && /fetch/i.test(error.message)) {
        throw new Error(
          `Cannot reach the API at ${API_BASE_URL}. ` +
            `Open ${API_BASE_URL}/health in a browser (it should return status ok). ` +
            `If that works, set CORS_ORIGIN or FRONTEND_URL on the backend to this site's origin with no trailing slash.`,
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Logout - clear stored auth data
   */
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.TENANT_ID_KEY);
      localStorage.removeItem(this.PERMISSIONS_KEY);
    }
  }

  /**
   * Persist the login-response permissions as a flat list of permission names.
   * The backend returns them grouped by module ({ products: ["products.read", ...] });
   * we flatten so callers can do a simple `includes(name)` check.
   */
  private setPermissions(permissions?: Record<string, string[]>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(this.flattenPermissions(permissions)));
  }

  /**
   * The backend always returns permissions grouped by module (`{ module: string[] }`)
   * — both from login and from GET /users/me/permissions — because that same grouped
   * shape backs the "My Permissions" table view in Account Settings. Never expect a
   * flat array here; flatten it the same way at every call site instead.
   */
  private flattenPermissions(permissions?: Record<string, string[]> | null): string[] {
    return permissions && typeof permissions === "object" && !Array.isArray(permissions)
      ? Object.values(permissions).flat().filter((p): p is string => typeof p === "string")
      : []
  }

  /**
   * Get the current user's granted permission names (flat) from the login response.
   */
  getPermissions(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.PERMISSIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Re-fetch the current user's effective permissions from the server and persist them.
   * Lets a role/permission change apply to a logged-in user without a re-login (#12).
   * Falls back to the cached permissions on any failure.
   */
  async refreshPermissions(): Promise<string[]> {
    if (typeof window === "undefined") return this.getPermissions();
    const token = this.getToken();
    if (!token) return this.getPermissions();
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) return this.getPermissions();
      const body = await response.json();
      const data = body?.data ?? body;
      const permissions = this.flattenPermissions(data?.permissions);
      localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
      return permissions;
    } catch {
      return this.getPermissions();
    }
  }

  /**
   * Get stored access token
   */
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user info
   */
  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Get stored tenant ID
   */
  getTenantId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TENANT_ID_KEY) || this.getUser()?.tenantId || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Set access token
   */
  private setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Set user info
   */
  private setUser(user: User): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Set tenant ID
   */
  private setTenantId(tenantId: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.TENANT_ID_KEY, tenantId);
    }
  }

  /**
   * Check if token is expired (basic check)
   * Note: Backend will validate token, this is just a client-side check
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;

      if (!exp) return false; // No expiration means it doesn't expire (unlikely but possible)

      // Check if token is expired (with 5 minute buffer)
      return Date.now() >= exp * 1000 - 5 * 60 * 1000;
    } catch {
      return true;
    }
  }
}

export const authService = new AuthService();
