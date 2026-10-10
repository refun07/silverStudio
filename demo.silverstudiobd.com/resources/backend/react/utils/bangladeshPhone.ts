export const BANGLADESH_MOBILE_REGEX = /^01[3-9]\d{8}$/;

export const BANGLADESH_MOBILE_ERROR =
    'Enter a valid 11-digit Bangladesh mobile number starting with 013 to 019';

export const sanitizeBangladeshMobile = (value: string): string =>
    value.replace(/\D/g, '').slice(0, 11);
