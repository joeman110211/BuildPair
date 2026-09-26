import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  type AnyPgColumn,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['customer', 'trader']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'core', 'basic', 'featured']);
export const jobStatusEnum = pgEnum('job_status', ['open', 'quoted', 'in_progress', 'completed', 'cancelled']);
export const quoteStatusEnum = pgEnum('quote_status', ['pending', 'accepted', 'declined', 'withdrawn']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'void', 'overdue']);
export const paymentStatusEnum = pgEnum('payment_status', ['requires_payment', 'processing', 'paid', 'failed', 'refunded']);
export const milestoneStatusEnum = pgEnum('milestone_status', ['pending', 'completed', 'paid']);

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user id
  email: text('email'),
  phone: text('phone'),
  role: userRoleEnum('role'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const traderProfiles = pgTable(
  'trader_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    businessName: text('business_name').notNull(),
    // Legacy primary category stays populated for compatibility with existing routes.
    tradeCategory: text('trade_category').notNull(),
    // Legacy flattened skills stay populated for compatibility/search while the
    // structured fields below are the product source of truth.
    subSkills: text('sub_skills').array().notNull().default(sql`ARRAY[]::text[]`),
    tradeCategories: text('trade_categories').array().notNull().default(sql`ARRAY[]::text[]`),
    serviceSelections: jsonb('service_selections').$type<Record<string, string[]>>().notNull().default({}),
    categoriesChangedAt: timestamp('categories_changed_at', { withTimezone: true }),
    bio: text('bio').notNull().default(''),
    radiusMiles: integer('radius_miles').notNull().default(10),
    postcode: text('postcode'),
    locationLabel: text('location_label'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    qualifications: text('qualifications').array().notNull().default(sql`ARRAY[]::text[]`),
    externalLinks: jsonb('external_links').$type<Record<string, string>>().notNull().default({}),
    photos: text('photos').array().notNull().default(sql`ARRAY[]::text[]`),
    selfCertified: boolean('self_certified').notNull().default(false),
    subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
    isSubscriptionActive: boolean('is_subscription_active').notNull().default(false),
    // Retained for future launch-time trial support, but current beta logic ignores it.
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeAccountId: text('stripe_account_id'),
    stripeChargesEnabled: boolean('stripe_charges_enabled').notNull().default(false),
    stripePayoutsEnabled: boolean('stripe_payouts_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('trader_profiles_user_id_unique').on(table.userId),
    index('trader_directory_trade_idx').on(table.tradeCategory, table.subscriptionTier),
    check('trader_radius_valid', sql`${table.radiusMiles} BETWEEN 1 AND 150`),
    check('trader_self_certification_required', sql`${table.selfCertified} = true`),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: text('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    targetTraderId: text('target_trader_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    propertyType: text('property_type').notNull(),
    postcode: text('postcode'),
    locationLabel: text('location_label'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    urgency: text('urgency').notNull(),
    description: text('description').notNull(),
    aiGeneratedSpec: text('ai_generated_spec'),
    budgetRange: text('budget_range').notNull(),
    photos: text('photos').array().notNull().default(sql`ARRAY[]::text[]`),
    isEmergency: boolean('is_emergency').notNull().default(false),
    scheduledStartAt: timestamp('scheduled_start_at', { withTimezone: true }),
    status: jobStatusEnum('status').notNull().default('open'),
    acceptedQuoteId: uuid('accepted_quote_id').references((): AnyPgColumn => quotes.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('jobs_customer_idx').on(table.customerId),
    index('jobs_target_trader_idx').on(table.targetTraderId),
    index('jobs_status_category_idx').on(table.status, table.category),
    index('jobs_emergency_idx').on(table.isEmergency, table.status, table.category),
  ],
);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    traderId: text('trader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    laborCost: integer('labor_cost').notNull(), // money is stored in pennies
    materialsCost: integer('materials_cost').notNull(),
    vatAmount: integer('vat_amount').notNull().default(0),
    depositAmount: integer('deposit_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    paymentTerms: text('payment_terms').notNull(),
    scope: text('scope'),
    exclusions: text('exclusions'),
    notes: text('notes'),
    durationDays: integer('duration_days'),
    warrantyMonths: integer('warranty_months'),
    proposedStartAt: timestamp('proposed_start_at', { withTimezone: true }),
    status: quoteStatusEnum('status').notNull().default('pending'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('quotes_job_trader_unique').on(table.jobId, table.traderId),
    index('quotes_trader_idx').on(table.traderId),
    check('quotes_amounts_non_negative', sql`${table.laborCost} >= 0 AND ${table.materialsCost} >= 0 AND ${table.vatAmount} >= 0 AND ${table.depositAmount} >= 0`),
    check('quotes_total_matches', sql`${table.totalAmount} = ${table.laborCost} + ${table.materialsCost} + ${table.vatAmount}`),
    check('quotes_deposit_valid', sql`${table.depositAmount} <= ${table.totalAmount}`),
    check('quote_duration_valid', sql`${table.durationDays} IS NULL OR ${table.durationDays} BETWEEN 1 AND 3650`),
    check('quote_warranty_valid', sql`${table.warrantyMonths} IS NULL OR ${table.warrantyMonths} BETWEEN 0 AND 240`),
  ],
);

export const jobMilestones = pgTable(
  'job_milestones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    amount: integer('amount').notNull(),
    status: milestoneStatusEnum('status').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paymentMethod: text('payment_method'),
    paymentConfirmedBy: text('payment_confirmed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('milestones_job_idx').on(table.jobId), check('milestone_amount_positive', sql`${table.amount} > 0`)],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'restrict' }),
    milestoneId: uuid('milestone_id').references(() => jobMilestones.id, { onDelete: 'restrict' }),
    customerId: text('customer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    traderId: text('trader_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    amount: integer('amount').notNull(),
    platformFee: integer('platform_fee').notNull().default(0),
    currency: text('currency').notNull().default('gbp'),
    stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
    status: paymentStatusEnum('status').notNull().default('requires_payment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('payments_intent_unique').on(table.stripePaymentIntentId),
    index('payments_job_idx').on(table.jobId),
    check('payment_amount_positive', sql`${table.amount} > 0`),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'restrict' }),
    customerId: text('customer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    traderId: text('trader_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull(),
    verifiedCompletion: boolean('verified_completion').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('reviews_job_customer_unique').on(table.jobId, table.customerId),
    index('reviews_trader_idx').on(table.traderId),
    check('reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceNumber: text('invoice_number').notNull(),
    traderId: text('trader_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    customerId: text('customer_id').references(() => users.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    items: jsonb('items').$type<{ description: string; quantity: number; unitPrice: number }[]>().notNull(),
    subtotal: integer('subtotal').notNull(),
    vatAmount: integer('vat_amount').notNull().default(0),
    depositAmount: integer('deposit_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    notes: text('notes'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('invoice_number_per_trader_unique').on(table.traderId, table.invoiceNumber),
    index('invoices_customer_idx').on(table.customerId),
    check('invoice_totals_valid', sql`${table.subtotal} >= 0 AND ${table.vatAmount} >= 0 AND ${table.depositAmount} >= 0 AND ${table.totalAmount} = ${table.subtotal} + ${table.vatAmount} AND ${table.depositAmount} <= ${table.totalAmount}`),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  traderProfile: one(traderProfiles, { fields: [users.id], references: [traderProfiles.userId] }),
  jobs: many(jobs),
  quotes: many(quotes),
  reviews: many(reviews),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(users, { fields: [jobs.customerId], references: [users.id] }),
  quotes: many(quotes),
  milestones: many(jobMilestones),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  job: one(jobs, { fields: [quotes.jobId], references: [jobs.id] }),
  trader: one(users, { fields: [quotes.traderId], references: [users.id] }),
  milestones: many(jobMilestones),
}));