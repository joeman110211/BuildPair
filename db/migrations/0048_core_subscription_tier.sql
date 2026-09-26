-- Add BuildPair Core between Starter Free and BuildPair Plus.
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'core' BEFORE 'basic';
