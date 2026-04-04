-- Add new columns to subscriptions table for Stripe integration
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS subscription_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Update RLS policies to allow reading subscription status
DROP POLICY IF EXISTS "Usuários podem ver suas próprias assinaturas" ON subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
ON subscriptions FOR ALL
USING (auth.jwt()->>'role' = 'service_role');