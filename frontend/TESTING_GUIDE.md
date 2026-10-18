# 🧪 Frontend-Backend Integration Testing Guide

## ✅ Integration Complete

The frontend has been fully integrated with the backend using **direct JWT authentication**.

## 🚀 Quick Start

### 1. Start Backend
```bash
# From project root
docker-compose up -d

# Verify backend is running
docker ps
```

### 2. Start Frontend
```bash
# From frontend directory
cd frontend
npm run dev
```

### 3. Access Application
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Swagger Docs: `http://localhost:5000/api/docs`

---

## 🔑 Test Credentials

```json
{
  "email": "admin@inventory.com",
  "password": "admin123",
  "tenantId": "8549"
}
```

---

## 📋 Test Checklist

### ✅ Test 1: Login Flow

1. Navigate to `http://localhost:3000/auth/login`
2. **Expected:** Login page loads with tenant ID pre-filled (8549)
3. Enter credentials:
   - Email: `admin@inventory.com`
   - Password: `admin123`
   - Tenant ID: `8549` (should be pre-filled)
4. Click "Sign In"
5. **Expected:**
   - ✅ Loading spinner appears
   - ✅ Success toast notification
   - ✅ Redirects to `/dashboard`
   - ✅ Dashboard loads successfully

### ✅ Test 2: Token Storage

After successful login, check browser DevTools:

1. Open DevTools (F12)
2. Go to Application/Storage → Local Storage → `http://localhost:3000`
3. **Expected:**
   - ✅ `access_token` exists (JWT token)
   - ✅ `user` exists (JSON string with user info)
   - ✅ `tenantId` exists (string: "8549")

### ✅ Test 3: Protected Routes

1. **While logged in:**
   - Navigate to `/dashboard`
   - **Expected:** Dashboard loads
   - Navigate to `/dashboard/users`
   - **Expected:** Users page loads

2. **After logout:**
   - Click logout in sidebar
   - **Expected:** Redirects to `/auth/login`
   - Try accessing `/dashboard` directly
   - **Expected:** Redirects to `/auth/login`

### ✅ Test 4: API Calls

1. **While logged in:**
   - Open DevTools → Network tab
   - Navigate to any dashboard page
   - **Expected:**
     - ✅ API requests include `Authorization: Bearer <token>` header
     - ✅ API requests include `X-Tenant-Id: 8549` header
     - ✅ Requests return 200 OK (not 401)

2. **Check API response:**
   - Try accessing `/dashboard/users` (makes API call)
   - **Expected:** User list loads (or empty state if no users)

### ✅ Test 5: Error Handling

1. **Invalid credentials:**
   - Try login with wrong password
   - **Expected:** Error toast appears, stays on login page

2. **Token expiration:**
   - Wait 30+ minutes (or manually expire token)
   - Try accessing protected route
   - **Expected:** Redirects to login

3. **Network error:**
   - Stop backend: `docker-compose stop backend`
   - Try login
   - **Expected:** Error toast with network error message

### ✅ Test 6: User Context

1. **After login:**
   - Check header (top right)
   - **Expected:** Shows user name and role
   - Check sidebar
   - **Expected:** User info displayed correctly

---

## 🔍 Verification Steps

### Check Authentication State

Open browser console and run:
```javascript
// Check token
localStorage.getItem('access_token')

// Check user
JSON.parse(localStorage.getItem('user'))

// Check tenant ID
localStorage.getItem('tenantId')
```

### Check API Requests

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Click on any API request
4. Check Headers tab:
   - ✅ `Authorization: Bearer <token>`
   - ✅ `X-Tenant-Id: 8549`

### Check Backend Logs

```bash
docker logs inventory_backend --tail 50
```

**Expected:** No authentication errors, successful login logs

---

## 🐛 Troubleshooting

### Issue: Login fails with "Network Error"

**Solution:**
1. Check backend is running: `docker ps`
2. Check backend logs: `docker logs inventory_backend`
3. Verify CORS: Check `CORS_ORIGIN` in `docker-compose.yml`
4. Check browser console for CORS errors

### Issue: 401 Unauthorized on protected routes

**Solution:**
1. Check token exists: `localStorage.getItem('access_token')`
2. Check token format (should start with `eyJ`)
3. Verify token hasn't expired
4. Check `X-Tenant-Id` header is included

### Issue: Redirect loop

**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Clear browser cache
3. Restart frontend dev server
4. Try login again

### Issue: CORS error

**Solution:**
1. Update `docker-compose.yml`:
   ```yaml
   CORS_ORIGIN: http://localhost:3000
   ```
2. Restart backend: `docker-compose restart backend`

---

## ✅ Success Criteria

Before proceeding to Phase 2, verify:

- [ ] ✅ Login works with real credentials
- [ ] ✅ Token is stored in localStorage
- [ ] ✅ Protected routes require authentication
- [ ] ✅ API calls include Authorization header
- [ ] ✅ User info displayed in header
- [ ] ✅ Logout clears auth and redirects
- [ ] ✅ No authentication bypass
- [ ] ✅ No hardcoded tokens
- [ ] ✅ Error handling works correctly

---

## 📝 Notes

- **Token expiration:** 30 minutes (configurable in backend)
- **Token storage:** localStorage (persists across page refreshes)
- **Auto-redirect:** On 401, automatically redirects to login
- **Tenant ID:** Required for all requests (stored from login response)

---

## 🎯 Next Steps

Once all tests pass:
1. ✅ Proceed to Phase 2 development
2. ✅ Test with different user roles
3. ✅ Test with multiple tenants
4. ✅ Add additional protected routes as needed

