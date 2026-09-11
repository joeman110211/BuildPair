const DEFAULT_CLOUDINARY_CLOUD_NAME = 'qrrcn7ma';

function firstPublicValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || null;
}

export function GET() {
  return Response.json(
    {
      clerkPublishableKey: firstPublicValue(
        process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
        process.env.CLERK_PUBLISHABLE_KEY,
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      ),
      stripePublishableKey: firstPublicValue(
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        process.env.STRIPE_PUBLISHABLE_KEY,
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      ),
      cloudinaryCloudName: firstPublicValue(
        process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
        process.env.CLOUDINARY_CLOUD_NAME,
      ) || DEFAULT_CLOUDINARY_CLOUD_NAME,
      releaseSha: process.env.BUILDPAIR_BUILD_SHA?.trim() || null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
