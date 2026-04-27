// Single canonical host for all legal documents. When migrating to kibun.app,
// update LEGAL_HOST and re-deploy privacy-policy.html / delete-account.html
// to the new host without changing call sites.
const LEGAL_HOST = 'https://fernanhick.github.io/kibun';

export const PRIVACY_POLICY_URL = `${LEGAL_HOST}/privacy-policy.html`;
export const DELETE_ACCOUNT_URL = `${LEGAL_HOST}/delete-account.html`;

// Apple's Standard EULA — acceptable per App Store Review Guideline 3.1.2(a)
// when shipping without a custom EULA.
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const MANAGE_SUBSCRIPTION_URL_IOS = 'https://apps.apple.com/account/subscriptions';
export const MANAGE_SUBSCRIPTION_URL_ANDROID = 'https://play.google.com/store/account/subscriptions';
