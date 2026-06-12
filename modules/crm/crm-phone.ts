export function normalizePhoneForWhatsapp(phone: string): string | null {
  const trimmedPhone = phone.trim();
  const digitsOnly = trimmedPhone.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  if (
    trimmedPhone.startsWith("+") &&
    isExplicitInternationalPhone(digitsOnly)
  ) {
    return digitsOnly;
  }

  if (trimmedPhone.startsWith("00")) {
    const internationalDigits = digitsOnly.replace(/^00+/, "");

    return isExplicitInternationalPhone(internationalDigits)
      ? internationalDigits
      : null;
  }

  if (
    isBrazilianPhoneWithCountryCode(digitsOnly) ||
    isLongInternationalPhone(digitsOnly)
  ) {
    return digitsOnly;
  }

  return null;
}

export function buildWhatsappUrl(phone: string): string | null {
  const normalizedPhone = normalizePhoneForWhatsapp(phone);

  return normalizedPhone ? `https://wa.me/${normalizedPhone}` : null;
}

function isBrazilianPhoneWithCountryCode(value: string) {
  return value.startsWith("55") && (value.length === 12 || value.length === 13);
}

function isExplicitInternationalPhone(value: string) {
  return value.length >= 8 && value.length <= 15;
}

function isLongInternationalPhone(value: string) {
  return value.length >= 12 && value.length <= 15;
}
