import { getSql } from '@/lib/sql';
import { requiredStripeEnvironment } from '@/lib/billing-readiness';
import { BUILDPAY_OPEN, PAID_PLANS_OPEN, PAID_PROJECT_PLUS_OPEN } from '@/lib/launch-config';

const requiredEnvironment = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'INVOICE_FROM_EMAIL',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const optionalEnvironment = [
  'DATABASE_URL_UNPOOLED',
  'ADMIN_CLERK_USER_IDS',
  'APP_URL',
  'SUPPORT_EMAIL',
  'CRON_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_CORE_PRICE_ID',
  'STRIPE_BASIC_PRICE_ID',
  'STRIPE_FEATURED_PRICE_ID',
  'STRIPE_PROJECT_PLUS_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CONNECT_WEBHOOK_SECRET',
] as const;

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const billingEnvironment = requiredStripeEnvironment({ trade: PAID_PLANS_OPEN, projectPlus: PAID_PROJECT_PLUS_OPEN, buildPay: BUILDPAY_OPEN });
  const missing = [...requiredEnvironment, ...billingEnvironment].filter((name) => !configured(name));
  const optionalMissing = optionalEnvironment.filter((name) => !configured(name));
  const missingSchema: string[] = [];

  if (!missing.includes('DATABASE_URL')) {
    try {
      const [schema] = await getSql()`
        SELECT
          (
            SELECT count(*) = 3
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name IN ('customer_enabled', 'trader_enabled', 'active_mode')
          ) AS "hasAccountModeColumns",
          (
            SELECT count(*) = 4
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name IN ('is_admin', 'is_suspended', 'suspension_reason', 'is_deleted')
          ) AS "hasAccountStateColumns",
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'trader_profiles'
              AND column_name = 'trial_ends_at'
          ) AS "hasTrialEndsAt",
          to_regclass('public.trader_profile_showcase') IS NOT NULL AS "hasTraderShowcase",
          to_regclass('public.job_workspace_entries') IS NOT NULL AS "hasJobWorkspace",
          to_regclass('public.customer_properties') IS NOT NULL AS "hasCustomerProperties",
          to_regclass('public.customer_property_jobs') IS NOT NULL AS "hasCustomerPropertyJobs",
          to_regclass('public.project_plus_usage') IS NOT NULL AS "hasProjectPlusUsage",
          to_regclass('public.business_reminder_log') IS NOT NULL AS "hasBusinessReminders",
          to_regclass('public.business_quote_options') IS NOT NULL AS "hasBusinessQuoteOptions",
          to_regprocedure('accept_job_quote(uuid,text)') IS NOT NULL AS "hasAcceptQuoteFunction",
          to_regprocedure('buildpair_delete_account(text)') IS NOT NULL AS "hasAccountDeleteFunction",
          EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'verify_review_before_insert'
              AND NOT tgisinternal
          ) AS "hasReviewVerificationTrigger",
          EXISTS (
            SELECT 1
            FROM buildpair_migrations
            WHERE filename = '0020_account_deletion_completion.sql'
          ) AS "hasLatestAccountDeletionMigration",
          EXISTS (
            SELECT 1 FROM buildpair_migrations WHERE filename = '0054_retention_property_attention.sql'
          ) AS "hasLatestRetentionMigration"
      ` as unknown as {
        hasAccountModeColumns: boolean;
        hasAccountStateColumns: boolean;
        hasTrialEndsAt: boolean;
        hasTraderShowcase: boolean;
        hasJobWorkspace: boolean;
        hasCustomerProperties: boolean;
        hasCustomerPropertyJobs: boolean;
        hasProjectPlusUsage: boolean;
        hasBusinessReminders: boolean;
        hasBusinessQuoteOptions: boolean;
        hasLatestRetentionMigration: boolean;
        hasAcceptQuoteFunction: boolean;
        hasAccountDeleteFunction: boolean;
        hasReviewVerificationTrigger: boolean;
        hasLatestAccountDeletionMigration: boolean;
      }[];

      if (!schema?.hasAccountModeColumns) missingSchema.push('users.account_modes');
      if (!schema?.hasAccountStateColumns) missingSchema.push('users.account_state');
      if (!schema?.hasTrialEndsAt) missingSchema.push('trader_profiles.trial_ends_at');
      if (!schema?.hasTraderShowcase) missingSchema.push('trader_profile_showcase');
      if (!schema?.hasJobWorkspace) missingSchema.push('job_workspace_entries');
      if (!schema?.hasCustomerProperties) missingSchema.push('customer_properties');
      if (!schema?.hasCustomerPropertyJobs) missingSchema.push('customer_property_jobs');
      if (!schema?.hasProjectPlusUsage) missingSchema.push('project_plus_usage');
      if (!schema?.hasBusinessReminders) missingSchema.push('business_reminder_log');
      if (!schema?.hasBusinessQuoteOptions) missingSchema.push('business_quote_options');
      if (!schema?.hasLatestRetentionMigration) missingSchema.push('0054_retention_property_attention.sql');
      if (!schema?.hasAcceptQuoteFunction) missingSchema.push('accept_job_quote(uuid,text)');
      if (!schema?.hasAccountDeleteFunction) missingSchema.push('buildpair_delete_account(text)');
      if (!schema?.hasReviewVerificationTrigger) missingSchema.push('verify_review_before_insert');
      if (!schema?.hasLatestAccountDeletionMigration) missingSchema.push('0020_account_deletion_completion.sql');
    } catch {
      missingSchema.push('database_schema_check');
    }
  }

  const ready = missing.length === 0 && missingSchema.length === 0;
  return Response.json(
    {
      status: ready ? 'ready' : 'configuration_required',
      ready,
      missing,
      missingSchema,
      optionalMissing,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
