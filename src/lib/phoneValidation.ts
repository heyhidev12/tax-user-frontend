/**
 * Korean mobile phone validation aligned with backend.
 * Pattern: 010 + exactly 8 digits = 11 digits total.
 * No spaces, dashes, or non-numeric characters.
 */

export const PHONE_REGEX = /^010\d{8}$/;

/** User-friendly error message (Korean) */
export const PHONE_ERROR_MESSAGE =
  "010으로 시작하는 11자리 숫자만 입력해주세요.";

/**
 * Strip all non-digit characters. Use for display/store to allow only digits.
 */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validate phone: must be exactly 010 + 8 digits.
 * Returns normalized digits and optional error message.
 */
export function validatePhone(value: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return { valid: false, normalized: "", error: "휴대폰 번호를 입력해주세요." };
  }
  if (!PHONE_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: PHONE_ERROR_MESSAGE,
    };
  }
  return { valid: true, normalized };
}

/**
 * Format input: allow only digits, max 11 chars (for 010 + 8 digits).
 * Call this in onChange to keep input digits-only.
 */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value);
  return digits.slice(0, 11);
}
