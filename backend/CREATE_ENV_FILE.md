# INSTRUCTIONS: Create .env file in backend folder

The issue is that your `.env` file has a corrupted DATABASE_URL. I've renamed it to `.env.backup`.

## Steps to Fix:

1. **Create a new file** named `.env` in `C:\Users\Mubeen\factory_distribution_system\backend\`

2. **Copy this exact content** into the new `.env` file:

```
DATABASE_URL="postgresql://postgres:password@localhost:5434/inventory?schema=public"
MASTER_DATABASE_URL="postgresql://postgres:password@localhost:5434/factory_distribution_master?schema=public"
JWT_SECRET="dev-secret-key-123"
JWT_EXPIRES_IN="24h"
ENCRYPTION_KEY="01234567890123456789012345678901"
PASSWORD_ENCRYPTION_KEY="01234567890123456789012345678901"
PORT=5000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME="demo"
CLOUDINARY_API_KEY="demo"
CLOUDINARY_API_SECRET="demo"
```

3. **Save the file**

4. **Run this in PowerShell** (in the backend folder):

```powershell
npx prisma db push --skip-generate
```

This should work now since the .env file will have the correct password (`password`).
