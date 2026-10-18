/**
 * Quick Authentication Check Script
 * 
 * Run this in browser console (F12) after logging in to verify authentication setup
 */

(function checkAuth() {
  console.log('🔍 AUTHENTICATION DIAGNOSTICS\n');
  console.log('='.repeat(50));
  
  // Check localStorage
  const token = localStorage.getItem('access_token');
  const tenantId = localStorage.getItem('tenantId');
  const userStr = localStorage.getItem('user');
  
  console.log('\n📦 LocalStorage Check:');
  console.log('  Token:', token ? `✅ Present (${token.substring(0, 20)}...)` : '❌ Missing');
  console.log('  TenantId:', tenantId ? `✅ Present (${tenantId})` : '❌ Missing');
  console.log('  User:', userStr ? '✅ Present' : '❌ Missing');
  
  // Parse user
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('\n👤 User Details:');
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  TenantId:', user.tenantId);
    } catch (e) {
      console.error('  ❌ Error parsing user:', e);
    }
  }
  
  // Check token validity
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const isValid = now < expiresAt;
        
        console.log('\n🎫 Token Details:');
        console.log('  Expires:', expiresAt.toLocaleString());
        console.log('  Valid:', isValid ? '✅ Yes' : '❌ Expired');
        console.log('  Time until expiry:', isValid ? `${Math.round((expiresAt - now) / 1000 / 60)} minutes` : 'Expired');
      }
    } catch (e) {
      console.error('  ❌ Error parsing token:', e);
    }
  }
  
  // Test API call
  console.log('\n🌐 Testing API Call...');
  if (token && tenantId) {
    fetch('http://localhost:5000/api/products?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({ error: 'No JSON response' }));
        console.log('  Status:', response.status, response.statusText);
        if (response.ok) {
          console.log('  ✅ API Test Success!');
          console.log('  Response:', data);
        } else {
          console.log('  ❌ API Test Failed');
          console.log('  Error:', data);
        }
      })
      .catch((err) => {
        console.error('  ❌ Network Error:', err);
      });
  } else {
    console.log('  ⚠️  Cannot test API - missing token or tenantId');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('💡 If you see errors, follow TROUBLESHOOTING_AUTH_ERRORS.md');
})();

