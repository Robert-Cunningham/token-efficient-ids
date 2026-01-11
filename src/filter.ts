export interface AllowOptions {
  /** Allow non-ASCII unicode characters (default: true) */
  unicode?: boolean;
  /** Allow whitespace characters (default: false) */
  whitespace?: boolean;
  /** Allow ASCII punctuation (non-alphanumeric) (default: true) */
  punctuation?: boolean;
  /** Allow numeric digits 0-9 (default: true) */
  numbers?: boolean;
  /** Allow uppercase letters (default: true) */
  uppercase?: boolean;
}

const WHITESPACE_REGEX = /\s/;
const NUMBERS_REGEX = /[0-9]/;
const UPPERCASE_REGEX = /[A-Z]/;
const PUNCTUATION_REGEX = /\p{P}|\p{S}/u; // Unicode punctuation and symbols

/**
 * Create a filter function based on allow options
 */
export function createAllowFilter(allow: AllowOptions): (token: string) => boolean {
  const {
    unicode = true,
    whitespace = true,
    punctuation = true,
    numbers = true,
    uppercase = true,
  } = allow;

  return (token: string): boolean => {
    for (const char of token) {
      const code = char.charCodeAt(0);

      // Check whitespace
      if (!whitespace && WHITESPACE_REGEX.test(char)) {
        return false;
      }

      // Check numbers
      if (!numbers && NUMBERS_REGEX.test(char)) {
        return false;
      }

      // Check uppercase
      if (!uppercase && UPPERCASE_REGEX.test(char)) {
        return false;
      }

      // Check punctuation and symbols
      if (!punctuation && PUNCTUATION_REGEX.test(char)) {
        return false;
      }

      // Check unicode (non-ASCII)
      if (!unicode && code > 127) {
        return false;
      }
    }
    return true;
  };
}
