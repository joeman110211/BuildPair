# BuildPair production hosting

BuildPair is currently being tested from the Chromebook using `docs/CHROMEBOOK_TEST_HOST.md`. This document describes the **later public-production move**, when BuildPair needs an always-on host independent of Joe's Chromebook.

BuildPair's production stack is provider-neutral: one Linux host runs the website and Expo Router API together, with Docker and Caddy keeping the deployment portable.

## Production shape

- `https://www.buildpair.co.uk` is the canonical public address.
- `https://buildpair.co.uk` redirects to `www`.
- `https://admin.buildpair.co.uk` is the dedicated owner/admin address and redirects its root to `/admin` inside the application.
- The public `www` host deliberately does not expose `/admin` or `/api/admin/*`.
- Caddy terminates HTTPS and renews certificates automatically for both the public and admin hostnames.
- The Expo web application and API routes run in the `app` container on port 3000.
- The application container is not exposed directly to the public internet.
- `/downloads/*` is served directly by Caddy from the local `downloads/` directory on the public host.
- Search-engine indexing is deliberately disabled during quiet launch with the `X-Robots-Tag: noindex, nofollow` response header. The admin hostname must always remain `noindex, nofollow`.

## Recommended first public server

For an early public beta, start with an Ubuntu LTS server around:

- 2 vCPU
- 4 GB RAM
- 40 GB+ SSD/NVMe
- public IPv4/IPv6 as appropriate

The provider is intentionally not hard-coded into the project. The same stack can move to another VPS/cloud later without changing the application architecture.

If traffic grows materially, move beyond a single VPS to proper load balancing, multiple application instances, managed caching/queues/storage and database scaling based on measured load. Do not pretend one small VPS is a mythical million-user machine.

## Chromebook role after public launch

During the current private-test phase the Chromebook can host BuildPair itself. Once BuildPair moves to public production, the Chromebook becomes the control centre rather than the always-on public server. Use it for:

- GitHub and release control
- SSH access to production
- encrypted credential backup
- database/admin tooling
- deployment checks
- monitoring and logs
- APK release management

Do not keep production secrets in the Git repository or in unencrypted notes/files.

## One-time public-server setup

1. Create an Ubuntu LTS host and add an SSH key.
2. Install Git and Docker Engine with the Docker Compose plugin.
3. Clone `https://github.com/joeman110211/BuildPair.git` to `/opt/buildpair`.
4. Copy `.env.example` to `/opt/buildpair/.env.production` and fill in production values.
5. Protect it:

   ```bash
   chmod 600 /opt/buildpair/.env.production
   ```

6. At the domain/DNS provider, point the required `@`, `www`, and `admin` records to the public environment. `admin.buildpair.co.uk` must resolve to the same Caddy endpoint unless the admin app is deliberately moved to a separate host later.
7. Allow only the network ports required by the chosen deployment. For the supplied Caddy setup that normally means TCP 22, 80 and 443 plus UDP 443 for HTTP/3. Restrict SSH where practical.
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
- Stripe keys/price IDs when billing is enabled
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- Cloudinary credentials
- `APP_URL=https://www.buildpair.co.uk`
- `BUILDPAIR_ADMIN_HOST=admin.buildpair.co.uk`

Keep `BUILDPAIR_PREVIEW_DATA_ENABLED=false` for a real public marketplace.

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

## Going fully public

Quiet-launch production deliberately prevents search-engine indexing. When BuildPair is ready for discovery, remove the `X-Robots-Tag: noindex, nofollow` response header from the `www.buildpair.co.uk` block in `infra/production/Caddyfile` and redeploy.

Do **not** remove the noindex header from `admin.buildpair.co.uk`.

Then add normal SEO, sitemap and search-console work as a separate launch task.
