-- Keep account deletion aligned with tables added after migration 0012.
-- Financial, invoice, review and completed-job records are retained where BuildPair
-- may need an auditable transaction history, but live/profile/discovery data is scrubbed.

CREATE OR REPLACE FUNCTION buildpair_delete_account(p_user_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET deletion_requested_at = now() WHERE id = p_user_id;

  -- Personal, discovery and notification data can be removed outright.
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM saved_traders WHERE customer_id = p_user_id OR trader_id = p_user_id;
  DELETE FROM trader_availability WHERE trader_id = p_user_id;
  DELETE FROM trader_credentials WHERE trader_id = p_user_id;
  DELETE FROM saved_job_searches WHERE trader_id = p_user_id;
  DELETE FROM trader_stories WHERE trader_id = p_user_id;
  DELETE FROM trader_profile_view_daily WHERE trader_id = p_user_id;
  DELETE FROM trader_job_offers WHERE trader_id = p_user_id;
  DELETE FROM trader_profile_showcase WHERE user_id = p_user_id;

  -- Remove private chat content. Message rows cascade with their conversation.
  DELETE FROM conversations WHERE customer_id = p_user_id OR trader_id = p_user_id;

  -- Timeline actor identity is not needed once the account is deleted.
  UPDATE job_events SET actor_id = NULL WHERE actor_id = p_user_id;

  -- Keep the commercial variation row when it belongs to a retained job, but remove
  -- the free-text scope details that could contain personal information.
  UPDATE job_variations
  SET title = 'Account-deleted variation',
      description = 'Variation details removed following account deletion.'
  WHERE customer_id = p_user_id OR trader_id = p_user_id;

  -- Customer-owned job descriptions/photos/location are personal marketplace data.
  -- Completed commercial rows remain linked to the pseudonymous internal user id so
  -- payment/review audit relationships are not broken.
  UPDATE jobs
  SET title = CASE WHEN status = 'completed' THEN 'Completed BuildPair job' ELSE 'Removed BuildPair job' END,
      description = 'Job details removed following account deletion.',
      ai_generated_spec = NULL,
      photos = ARRAY[]::text[],
      postcode = NULL,
      location_label = NULL,
      latitude = NULL,
      longitude = NULL,
      status = CASE WHEN status IN ('open','quoted') THEN 'cancelled'::job_status ELSE status END,
      updated_at = now()
  WHERE customer_id = p_user_id;

  -- Unawarded direct requests must no longer target a deleted tradesperson.
  UPDATE jobs SET target_trader_id = NULL, updated_at = now()
  WHERE target_trader_id = p_user_id AND status IN ('open','quoted');

  DELETE FROM trader_profiles WHERE user_id = p_user_id;

  -- The row remains as a pseudonymous audit anchor because payment/review/invoice
  -- foreign keys intentionally use RESTRICT. Direct identity and account modes go.
  UPDATE users
  SET email = NULL,
      phone = NULL,
      role = NULL,
      customer_enabled = false,
      trader_enabled = false,
      active_mode = NULL,
      is_deleted = true,
      deleted_at = now(),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
