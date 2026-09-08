# BuildPair production hosting

BuildPair's public production shape is provider-neutral: one Linux host can run the website and Expo Router API together, with Docker and Caddy keeping deployment portable. The Chromebook remains useful as a development/control machine, not as the intended always-on public host.

## Production shape

- `https://www.buildpair.co.uk` is the canonical public address.
- `https://buildpair.co.uk` redirects to `www`.
- `https://admin.buildpair.co.uk` is the dedicated owner/admin address and redirects its root to `/admin` inside the application once DNS resolves correctly.
- The public `www` host deliberately does not expose `/admin` or `/api/admin/*`.
- Caddy terminates HTTPS and renews certificates automatically for both public and admin hostnames.
- The Expo web application and API routes run in the `app` container on port 3000.
- The application container is not exposed directly to the public internet.
- `/downloads/*` is served directly by Caddy from the local `downloads/` directory on the public host.
- Search-engine indexing can be disabled during quiet launch with the `X-Robots-Tag: noindex, nofollow` response header. The admin hostname must always remain `noindex, nofollow`.
- Preview/demo marketplace fixtures must remain disabled on public production. The application hard-blocks them on production hostnames as an additional safeguard.

## Recommended server shape

For an early public beta, a sensible starting point is an Ubuntu LTS server around:

- 2 vCPU
- 4 GB RAM
- 40 GB+ SSD/NVMe
- public IPv4/IPv6 as appropriate

The provider is intentionally not hard-coded. The same stack can move to another VPS/cloud later without changing the application architecture.

If traffic grows materially, scale based on measurements: load balancing, multiple app instances, managed caching/queues/storage and database scaling. One small VPS is not a mythical million-user machine, despite what optimistic diagrams sometimes imply.

## Chromebook role

Use the Chromebook as a control/development machine for:

- GitHub and release control
- SSH access to production
- encrypted credential backup
- database/admin tooling
- deployment checks
- monitoring and logs
- APK release management
- local/private recovery testing where useful

Do not keep production secrets in the Git repository or in unencrypted notes/files.

## One-time server setup

1. Create an Ubuntu LTS host and add an SSH key.
2. Install Git and Docker Engine with the Docker Compose plugin.
3. Clone `https://github.com/joeman110211/BuildPair.git` to `/opt/buildpair`.
4. Copy `.env.example` to `/opt/buildpair/.env.production` and fill in production values.
5. Protect it:

   ```bash
   chmod 600 /opt/buildpair/.env.production
   ```

6. At the DNS provider, point the required `@`, `www`, and `admin` records to the public environment. `admin.buildpair.co.uk` must resolve to the same Caddy endpoint unless the admin app is deliberately moved to a separate host later.
7. Allow only the required network ports. For the supplied Caddy setup that normally means TCP 22, 80 and 443 plus UDP 443 for HTTP/3. Restrict SSH where practical.
8. Run:

   ```bash
   cd /opt/buildpair
   bash scripts/deploy-production.sh
   ```

Caddy requests public TLS certificates once DNS resolves to the server and the challenge ports are reachable.

After deployment, check both `https://www.buildpair.co.uk/api/health` and `https://admin.buildpair.co.uk/`. The admin hostname should redirect to `/admin`, then require the dedicated administrator sign-in flow and an account with administrator access.

## Production environment values

At minimum, `.env.production` must contain the live values used by BuildPair, including:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_URL=https://www.buildpair.co.uk`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` for migrations where required
- Stripe keys/price IDs when billing is enabled
- `GEMINI_API_KEY` when Gemini assistance is enabled
- `RESEND_API_KEY` when email is enabled
- Cloudinary credentials when uploads are enabled
- `APP_URL=https://www.buildpair.co.uk`
- `BUILDPAIR_ADMIN_HOST=admin.buildpair.co.uk`
- `BUILDPAIR_PREVIEW_DATA_ENABLED=false`

Do not rely on a public client variable to hold a server secret.

## Android downloads

When an APK is approved for direct testing/distribution, place it on the production server at:

```text
/opt/buildpair/downloads/buildpair-android.apk
```

It will then be available from:

```text
https://www.buildpair.co.uk/downloads/buildpair-android.apk
```

Android can install a directly distributed APK after the user permits installation from that browser/source.

The dedicated admin APK is a separate application identity and should target the dedicated admin origin. Its build must not silently fall back to staging or the public host.

## iPhone/iPad

For early public use, iPhone users can use the BuildPair web app at `www.buildpair.co.uk`.

A normal public iOS native-app download should later point to the Apple App Store. TestFlight is the appropriate route for pre-release native iOS testing. A raw IPA is not a practical equivalent of Android's public APK download for ordinary users.

## Updating production

Once a change is approved on `main`, SSH to the server and run:

```bash
cd /opt/buildpair
bash scripts/deploy-production.sh
```

The script fast-forwards to the latest `main`, rebuilds the containers, restarts the stack and verifies the application health endpoint. This can later be wrapped in an automated deployment workflow once the public host and credentials are stable.

## Quiet launch to indexed launch

If quiet-launch production currently sends `X-Robots-Tag: noindex, nofollow`, remove that header from the `www.buildpair.co.uk` block only when BuildPair is ready for search-engine discovery, then redeploy.

Do **not** remove the noindex header from `admin.buildpair.co.uk`.

Add normal SEO, sitemap and search-console work as a separate launch task rather than mixing it into infrastructure changes.
