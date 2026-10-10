export function requiredStripeEnvironment(features: { trade: boolean; projectPlus: boolean; buildPay: boolean }) {
  return [
    ...(features.trade || features.projectPlus || features.buildPay ? ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] : []),
    ...(features.trade ? ['STRIPE_CORE_PRICE_ID', 'STRIPE_BASIC_PRICE_ID', 'STRIPE_FEATURED_PRICE_ID'] : []),
    ...(features.projectPlus ? ['STRIPE_PROJECT_PLUS_PRICE_ID', 'STRIPE_PROJECT_PLUS_PORTAL_CONFIG_ID'] : []),
    ...(features.buildPay ? ['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_CONNECT_WEBHOOK_SECRET'] : []),
  ];
}
