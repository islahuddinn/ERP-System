import { Injectable } from "@nestjs/common";

/**
 * Utility service responsible for generating short, human-friendly tenant IDs.
 * The generated identifiers are strictly 4 numeric characters (0000-9999).
 */
@Injectable()
export class ShortIdService {
  private static readonly DEFAULT_LENGTH = 4;
  private static readonly MAX_ATTEMPTS = 200;

  /**
   * Generate a random 4-digit numeric candidate (zero padded).
   */
  generateCandidate(): string {
    const value = Math.floor(Math.random() * 10 ** ShortIdService.DEFAULT_LENGTH);
    return value.toString().padStart(ShortIdService.DEFAULT_LENGTH, "0");
  }

  /**
   * Generate a unique short ID using a supplied uniqueness check.
   *
   * @param existsChecker async predicate that returns true when the candidate already exists
   */
  async generateUnique(existsChecker: (candidate: string) => Promise<boolean>): Promise<string> {
    for (let attempt = 0; attempt < ShortIdService.MAX_ATTEMPTS; attempt += 1) {
      const candidate = this.generateCandidate();
      if (!(await existsChecker(candidate))) {
        return candidate;
      }
    }

    throw new Error("Unable to generate unique short tenant ID after maximum attempts");
  }
}
