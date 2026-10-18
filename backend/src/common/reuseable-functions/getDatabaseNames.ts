export const getTenantDatabaseName = (): string => {
  return new URL(process.env.DATABASE_URL).pathname.replace("/", "");
};

export const getMasterDatabaseName = (): string => {
  return new URL(process.env.MASTER_DATABASE_URL).pathname.replace("/", "");
};
