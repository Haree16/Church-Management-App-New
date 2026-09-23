export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0 to 100
}

/**
 * Validates password complexity according to industry standard website rules:
 * - At least 8 characters in length
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&* etc.)
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const val = password || '';
  const minLength = val.length >= 8;
  const hasUppercase = /[A-Z]/.test(val);
  const hasLowercase = /[a-z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  // Special characters: non-alphanumeric
  const hasSpecial = /[^A-Za-z0-9]/.test(val);

  const errors: string[] = [];
  if (!minLength) errors.push('Must be at least 8 characters long');
  if (!hasUppercase) errors.push('Include at least one uppercase letter (A-Z)');
  if (!hasLowercase) errors.push('Include at least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('Include at least one number (0-9)');
  if (!hasSpecial) errors.push('Include at least one special character (e.g. !@#$%^&*)');

  const criteriaMet = [minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  const score = criteriaMet * 20;

  if (val.length === 0) {
    strength = 'weak';
  } else if (criteriaMet <= 2) {
    strength = 'weak';
  } else if (criteriaMet === 3) {
    strength = 'fair';
  } else if (criteriaMet === 4) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    rules: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
    },
    strength,
    score,
  };
}
