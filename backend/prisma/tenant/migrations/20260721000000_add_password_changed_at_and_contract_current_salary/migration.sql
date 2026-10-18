-- Force-logout after password change (#13)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- Denormalized current salary for sortable Contracts list (#1)
ALTER TABLE "hr_employee_contracts" ADD COLUMN IF NOT EXISTS "current_salary" DECIMAL(12,2);
