/**
 * Prisma 6+ config — when this file exists, the CLI does NOT auto-load .env.
 * Load backend/.env explicitly so DATABASE_URL is available for migrate/generate.
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'prisma/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

export default defineConfig({})
