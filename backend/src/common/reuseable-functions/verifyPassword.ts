import * as bcrypt from "bcrypt";

export const verifyPassword = async (plain: string, hashed: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch (error) {
    return false;
  }
};
