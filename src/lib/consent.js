// What people agree to, in one place, so sign-up and the one-time update
// screen for existing accounts say exactly the same thing. Health details
// count as sensitive/special-category data almost everywhere (Australian
// Privacy Act, GDPR/UK GDPR, Washington's My Health My Data Act), so consent
// to keeping them is asked for separately and explicitly, and recorded on
// the account with the version and time.

export const CONSENT_VERSION = "2026-11-01";

export const HEALTH_CONSENT_TEXT =
  "I agree to CelerySync keeping the health details I choose to log — like how I feel, my energy, symptoms and routine — to run the app for me, as explained in the Privacy Policy. I can download or delete them any time.";

export const hasCurrentConsent = (user) =>
  !!user?.user_metadata?.health_data_consent_at && !!user?.user_metadata?.age_confirmed_18;

export const consentMetadata = () => {
  const now = new Date().toISOString();
  return {
    age_confirmed_18: true,
    agreed_terms_version: CONSENT_VERSION,
    agreed_terms_at: now,
    health_data_consent_at: now,
    health_data_consent_version: CONSENT_VERSION,
  };
};
