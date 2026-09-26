import { createClerkClient } from '@clerk/backend';
import { lookupPostcode } from '@/lib/postcode';
import { getSql } from '@/lib/sql';

const TARGET_EMAIL = 'buildpair1102@gmail.com';
const TARGET_PASSWORD = 'BuildPair123';
const SETUP_KEY_SHA256 = 'f0c609631108ac92e05ecaea7e9c1a61f18ea16887e29a0e8f7447b0a6c23891';

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { setupKey?: string };
    if (!body.setupKey || await sha256(body.setupKey) !== SETUP_KEY_SHA256) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const sql = getSql();
    const previous = await sql`
      SELECT subject_user_id AS "userId"
      FROM admin_user_actions
      WHERE action_type = 'internal_test_account_bootstrap'
        AND lower(subject_email) = lower(${TARGET_EMAIL})
      ORDER BY created_at DESC
      LIMIT 1
    ` as unknown as { userId: string | null }[];

    if (previous[0]) {
      return Response.json({ ok: true, alreadyBootstrapped: true, userId: previous[0].userId });
    }

    const secretKey = process.env.CLERK_SECRET_KEY?.trim();
    if (!secretKey) return Response.json({ error: 'Clerk is not configured' }, { status: 503 });

    const clerk = createClerkClient({ secretKey });
    const existing = await clerk.users.getUserList({ emailAddress: [TARGET_EMAIL], limit: 10 });
    let clerkUser = existing.data[0];

    if (!clerkUser) {
      clerkUser = await clerk.users.createUser({
        emailAddress: [TARGET_EMAIL],
        password: TARGET_PASSWORD,
        firstName: 'BuildPair',
        lastName: 'Tester',
      });
    } else {
      clerkUser = await clerk.users.updateUser(clerkUser.id, {
        password: TARGET_PASSWORD,
        firstName: 'BuildPair',
        lastName: 'Tester',
      });
    }

    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        buildpairMode: 'trader',
        buildpairInternalTest: true,
      },
    });

    await sql`
      INSERT INTO users (
        id, email, role, customer_enabled, trader_enabled, active_mode,
        is_admin, is_suspended, suspension_reason, is_deleted, updated_at
      )
      VALUES (
        ${clerkUser.id}, ${TARGET_EMAIL}, 'trader', true, true, 'trader',
        true, false, '', false, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = 'trader',
        customer_enabled = true,
        trader_enabled = true,
        active_mode = 'trader',
        is_admin = true,
        is_suspended = false,
        suspension_reason = '',
        is_deleted = false,
        updated_at = now()
    `;

    const location = await lookupPostcode('GU1 4YD');
    const services = {
      Tiling: [
        'Bathroom tiling',
        'Kitchen tiling',
        'Wall tiling',
        'Floor tiling',
        'Wet rooms',
        'Large-format tiles',
        'Porcelain',
        'Ceramic',
        'Natural stone',
        'Splashbacks',
        'Tile repairs',
        'Regrouting',
        'Waterproofing & tanking',
      ],
      Bathrooms: [
        'Full bathroom refits',
        'Showers',
        'Wet rooms',
        'Baths',
        'Bathroom tiling',
        'Waterproofing & tanking',
      ],
    };

    await sql`
      INSERT INTO trader_profiles (
        user_id, business_name, trade_category, sub_skills, trade_categories,
        service_selections, categories_changed_at, bio, radius_miles, postcode,
        location_label, latitude, longitude, qualifications, external_links,
        photos, self_certified, subscription_tier, is_subscription_active,
        paid_subscription_tier, complimentary_tier, complimentary_granted_at,
        complimentary_granted_by, complimentary_reason, trial_ends_at, updated_at
      )
      VALUES (
        ${clerkUser.id},
        'BuildPair Internal Test Trade — Do Not Hire',
        'Tiling',
        ${services.Tiling},
        ${['Tiling', 'Bathrooms']},
        ${JSON.stringify(services)}::jsonb,
        now(),
        'Internal BuildPair test profile used by the owner to inspect homeowner and tradesperson workflows. This is not a real trading business and must not be contacted or hired.',
        25,
        ${location.postcode},
        ${location.locationLabel},
        ${location.latitude},
        ${location.longitude},
        ${['Internal test profile — no public qualification claim']},
        ${JSON.stringify({})}::jsonb,
        ${[]},
        true,
        'featured',
        true,
        NULL,
        'featured',
        now(),
        ${clerkUser.id},
        'Internal owner test account',
        NULL,
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        trade_category = EXCLUDED.trade_category,
        sub_skills = EXCLUDED.sub_skills,
        trade_categories = EXCLUDED.trade_categories,
        service_selections = EXCLUDED.service_selections,
        bio = EXCLUDED.bio,
        radius_miles = EXCLUDED.radius_miles,
        postcode = EXCLUDED.postcode,
        location_label = EXCLUDED.location_label,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        qualifications = EXCLUDED.qualifications,
        external_links = EXCLUDED.external_links,
        photos = EXCLUDED.photos,
        self_certified = true,
        subscription_tier = 'featured',
        is_subscription_active = true,
        complimentary_tier = 'featured',
        complimentary_granted_at = now(),
        complimentary_granted_by = ${clerkUser.id},
        complimentary_reason = 'Internal owner test account',
        updated_at = now()
    `;

    await sql`
      INSERT INTO trader_profile_showcase (
        user_id, template, colour_theme, years_experience, year_established,
        service_areas, before_after_projects, updated_at
      )
      VALUES (
        ${clerkUser.id}, 'modern', 'burnt_orange', 15, 2011,
        ${['Guildford', 'Woking', 'Surrey']}, '[]'::jsonb, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        template = 'modern',
        colour_theme = 'burnt_orange',
        years_experience = 15,
        year_established = 2011,
        service_areas = ${['Guildford', 'Woking', 'Surrey']},
        before_after_projects = '[]'::jsonb,
        updated_at = now()
    `;

    await sql`
      INSERT INTO customer_properties (
        customer_id, nickname, property_type, postcode,
        address_line1, address_line2, town_city, access_notes
      )
      SELECT
        ${clerkUser.id}, 'Test Home', 'House', 'GU1 4YD',
        '1 Test Street', NULL, 'Guildford',
        'Internal test property. No real resident or appointment.'
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_properties
        WHERE customer_id = ${clerkUser.id}
          AND nickname = 'Test Home'
      )
    `;

    await sql`
      INSERT INTO admin_user_actions (
        admin_id, subject_user_id, subject_email, action_type, details
      )
      VALUES (
        ${clerkUser.id}, ${clerkUser.id}, ${TARGET_EMAIL},
        'internal_test_account_bootstrap',
        ${JSON.stringify({ modes: ['customer', 'trader'], plan: 'featured', property: 'Test Home' })}::jsonb
      )
    `;

    return Response.json({
      ok: true,
      userId: clerkUser.id,
      email: TARGET_EMAIL,
      customerEnabled: true,
      traderEnabled: true,
      activeMode: 'trader',
      isAdmin: true,
      tradeProfile: 'BuildPair Internal Test Trade — Do Not Hire',
      plan: 'BuildPair Pro',
      testProperty: 'Test Home',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed';
    console.error('[internal-test-bootstrap]', message);
    return Response.json({ error: 'Bootstrap failed', detail: message.slice(0, 300) }, { status: 500 });
  }
}
