/**
 * Shared password validation: 6–12 chars, at least 2 of
 * letters / numbers / special characters.
 */

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 12;

export const PASSWORD_ERROR_INVALID =
  "비밀번호는 6~12자이며 영문, 숫자, 특수문자 중 2가지 이상을 조합해야 합니다.";
export const PASSWORD_ERROR_MISMATCH = "비밀번호가 일치하지 않습니다.";

export interface PasswordRules {
  lengthOk: boolean;
  hasLetters: boolean;
  hasNumbers: boolean;
  hasSpecial: boolean;
  typeCountOk: boolean; // at least 2 of letters/numbers/special
  valid: boolean;
}

/**
 * Get live rule state for a password (for real-time UI feedback).
 */
export function getPasswordRules(value: string): PasswordRules {
  const pwd = value ?? "";
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(pwd);
  const typeCount = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;
  const typeCountOk = typeCount >= 2;
  const lengthOk =
    pwd.length >= PASSWORD_MIN_LENGTH && pwd.length <= PASSWORD_MAX_LENGTH;
  const valid = lengthOk && typeCountOk;
  return {
    lengthOk,
    hasLetters,
    hasNumbers,
    hasSpecial,
    typeCountOk,
    valid,
  };
}

/**
 * Validate password. Returns valid flag and optional error message.
 */
export function validatePassword(value: string): {
  valid: boolean;
  error?: string;
} {
  const pwd = (value ?? "").trim();
  if (!pwd) {
    return { valid: false, error: "비밀번호를 입력해주세요." };
  }
  const rules = getPasswordRules(pwd);
  if (!rules.valid) {
    return { valid: false, error: PASSWORD_ERROR_INVALID };
  }
  return { valid: true };
}

/**
 * Check if confirm matches password (for live confirm feedback).
 */
export function isConfirmMatch(password: string, confirm: string): boolean {
  if (!confirm) return false;
  return password === confirm;
}
