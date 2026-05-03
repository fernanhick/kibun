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

// Receives feedback from the in-app "Send feedback" flow (settings + unhappy
// branch of the review prompt). Update here only — call sites import this.
export const SUPPORT_EMAIL = 'fernanhick@gmail.com';

// iOS App Store numeric ID — used as a fallback "write a review" deep link
// when StoreReview.requestReview() is unavailable.
export const APP_STORE_ID = '6761697507';

// Android Play Store package id (matches app.config.ts android.package). Used
// for the Play Store fallback "write a review" deep link.
export const PLAY_STORE_PACKAGE = 'com.kibun.app';
