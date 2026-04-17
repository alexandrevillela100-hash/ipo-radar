import Stripe from "stripe";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { PLANS, type SubscriptionTier } from "./products";

// Lazy-init Stripe client
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
  }
  return _stripe;
}

async function ensurePrice(planKey: string): Promise<string> {
  const stripe = getStripe();
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);

  const isAnnual = planKey.includes("annual");
  const lookupKey = isAnnual
    ? plan.stripePriceAnnualLookup
    : plan.stripePriceMonthlyLookup;

  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existingPrices.data.length > 0) {
    return existingPrices.data[0].id;
  }

  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { tier: plan.tier, plan_key: planKey },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: isAnnual ? plan.annualPrice : plan.monthlyPrice,
    currency: "usd",
    recurring: {
      interval: isAnnual ? "year" : "month",
    },
    lookup_key: lookupKey,
    metadata: { tier: plan.tier, plan_key: planKey },
  });

  return price.id;
}

async function getOrCreateCustomer(
  userId: number,
  email: string,
  name: string | null
): Promise<string> {
  const stripe = getStripe();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { user_id: userId.toString() },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: number;
  email: string;
  name: string | null;
  planKey: string;
  origin: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const plan = PLANS[params.planKey];
  if (!plan) throw new Error(`Unknown plan: ${params.planKey}`);

  const customerId = await getOrCreateCustomer(
    params.userId,
    params.email,
    params.name
  );
  const priceId = await ensurePrice(params.planKey);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: params.userId.toString(),
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        user_id: params.userId.toString(),
        tier: plan.tier,
        plan_key: params.planKey,
      },
    },
    success_url: `${params.origin}/app/calendar?checkout=success`,
    cancel_url: `${params.origin}/pricing?checkout=cancelled`,
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.email,
      customer_name: params.name || "",
      plan_key: params.planKey,
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return { url: session.url };
}

export async function createBillingPortalSession(params: {
  userId: number;
  origin: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${params.origin}/dashboard/settings`,
  });

  return { url: session.url };
}

export async function getSubscriptionStatus(userId: number): Promise<{
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
}> {
  const db = await getDb();
  if (!db) {
    return { tier: "free", status: "none", currentPeriodEnd: null, cancelAtPeriodEnd: false, trialEnd: null };
  }

  const [user] = await db
    .select({
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      stripeSubscriptionId: users.stripeSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { tier: "free", status: "none", currentPeriodEnd: null, cancelAtPeriodEnd: false, trialEnd: null };
  }

  if (user.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const subData = sub as any;
      return {
        tier: (user.subscriptionTier as SubscriptionTier) || "free",
        status: subData.status,
        currentPeriodEnd: subData.current_period_end ?? null,
        cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
        trialEnd: subData.trial_end ?? null,
      };
    } catch {
      // If Stripe call fails, return cached data
    }
  }

  return {
    tier: (user.subscriptionTier as SubscriptionTier) || "free",
    status: user.subscriptionStatus || "none",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
  };
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    return;
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planKey = session.metadata?.plan_key;

      if (!userId) {
        console.error("[Stripe Webhook] No user_id in session metadata");
        return;
      }

      const plan = planKey ? PLANS[planKey] : null;
      const tier = plan?.tier || "pro";

      await db
        .update(users)
        .set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionTier: tier,
          subscriptionStatus: "active",
        })
        .where(eq(users.id, parseInt(userId)));

      console.log(`[Stripe Webhook] User ${userId} subscribed to ${tier}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) {
        console.warn(`[Stripe Webhook] No user found for customer ${customerId}`);
        return;
      }

      const tier = (subscription.metadata?.tier as SubscriptionTier) || "pro";

      await db
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionTier: subscription.status === "active" || subscription.status === "trialing" ? tier : "free",
          subscriptionStatus: subscription.status,
        })
        .where(eq(users.id, user.id));

      console.log(`[Stripe Webhook] Subscription updated for user ${user.id}: ${subscription.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) {
        console.warn(`[Stripe Webhook] No user found for customer ${customerId}`);
        return;
      }

      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
        })
        .where(eq(users.id, user.id));

      console.log(`[Stripe Webhook] Subscription canceled for user ${user.id}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (user) {
        await db
          .update(users)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(users.id, user.id));

        console.log(`[Stripe Webhook] Payment failed for user ${user.id}`);
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
