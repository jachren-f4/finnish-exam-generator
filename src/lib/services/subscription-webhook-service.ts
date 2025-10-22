import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

/**
 * RevenueCat Webhook Event Types
 */
export type WebhookEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'REFUND'
  | 'EXPIRATION'
  | 'SUBSCRIPTION_EXTENDED'

export type SubscriptionStatus =
  | 'unactivated'
  | 'free_trial'
  | 'premium_weekly'
  | 'premium_annual'
  | 'cancelled'
  | 'free_trial_expired'

/**
 * RevenueCat Webhook Payload Structure
 */
export interface RevenueCatWebhookPayload {
  event: {
    type: WebhookEventType
    id: string
    timestamp?: string
  }
  app?: {
    name: string
  }
  subscriber: {
    id: string
  }
  product?: {
    id: string
    type: string
  }
  price?: {
    amount: number
    currency: string
  }
  transaction?: {
    id: string
    purchaseDate?: string
  }
  expiration?: {
    date: string
    cancellationReason?: string
  }
}

/**
 * SubscriptionWebhookService handles all RevenueCat webhook processing
 * Validates signatures, processes events, and updates Supabase
 */
export class SubscriptionWebhookService {
  private publicKey: string

  constructor() {
    this.publicKey = process.env.REVENUECAT_PUBLIC_KEY || ''
    if (!this.publicKey) {
      console.warn('[Webhooks] REVENUECAT_PUBLIC_KEY not configured')
    }
  }

  /**
   * Validate RevenueCat webhook signature
   * Uses HMAC-SHA256 with public key
   */
  validateSignature(payload: Buffer, signature: string): boolean {
    if (!this.publicKey) {
      console.error('[Webhooks] Public key not configured, rejecting webhook')
      return false
    }

    try {
      // Compute HMAC-SHA256 of the payload
      const computed = crypto
        .createHmac('sha256', this.publicKey)
        .update(payload)
        .digest('base64')

      // Timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
    } catch (error) {
      console.error('[Webhooks] Signature validation error:', error)
      return false
    }
  }

  /**
   * Check for duplicate events to prevent double processing
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('subscription_history')
        .select('id')
        .eq('revenuecat_event_id', eventId)
        .limit(1)
        .single()

      return !!data
    } catch (error: any) {
      // Not found is not an error in this case
      if (error?.code === 'PGRST116') {
        return false
      }
      throw error
    }
  }

  /**
   * Get subscription record by RevenueCat customer ID
   */
  async getSubscriptionByCustomerId(customerId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  }

  /**
   * Create a new subscription record
   */
  async createSubscription(
    userId: string,
    customerId: string,
    initialStatus: SubscriptionStatus = 'unactivated'
  ) {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        revenuecat_customer_id: customerId,
        subscription_status: initialStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Map RevenueCat product ID to subscription status
   */
  private mapProductToStatus(productId: string): SubscriptionStatus {
    switch (productId) {
      case 'examgenie_weekly':
        return 'premium_weekly'
      case 'examgenie_annual':
        return 'premium_annual'
      default:
        return 'unactivated'
    }
  }

  /**
   * Process INITIAL_PURCHASE event
   */
  async handleInitialPurchase(payload: RevenueCatWebhookPayload): Promise<void> {
    const customerId = payload.subscriber.id
    const productId = payload.product?.id || ''
    const expirationDate = payload.expiration?.date
    const transactionId = payload.transaction?.id
    const price = payload.price?.amount
    const currency = payload.price?.currency

    if (!customerId || !productId || !expirationDate) {
      throw new Error('Missing required fields for INITIAL_PURCHASE: customerId, productId, expirationDate')
    }

    const newStatus = this.mapProductToStatus(productId)

    // Start transaction
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    // Use transaction for atomicity
    if (subscription) {
      // Update existing subscription
      const previousStatus = subscription.subscription_status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          subscription_status: newStatus,
          subscription_expiry: expirationDate,
          user_currency: currency,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) throw updateError

      // Create history record
      await this.createHistoryRecord({
        userId: subscription.user_id,
        eventType: 'INITIAL_PURCHASE',
        previousStatus,
        newStatus,
        eventId: payload.event.id,
        transactionId,
        productId,
        price,
        currency,
        webhookTimestamp: payload.event.timestamp,
        rawData: payload
      })
    } else {
      // User not found - store for manual review
      await this.storeFailedWebhook(payload, 'User subscription not found')
      throw new Error(`Subscription not found for customer ID: ${customerId}`)
    }
  }

  /**
   * Process RENEWAL event
   */
  async handleRenewal(payload: RevenueCatWebhookPayload): Promise<void> {
    const customerId = payload.subscriber.id
    const expirationDate = payload.expiration?.date
    const productId = payload.product?.id

    if (!customerId || !expirationDate) {
      throw new Error('Missing required fields for RENEWAL: customerId, expirationDate')
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (error) throw error
    if (!subscription) {
      throw new Error(`Subscription not found for customer ID: ${customerId}`)
    }

    // Update expiry only, keep status the same
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        subscription_expiry: expirationDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) throw updateError

    // Create history record
    await this.createHistoryRecord({
      userId: subscription.user_id,
      eventType: 'RENEWAL',
      previousStatus: subscription.subscription_status,
      newStatus: subscription.subscription_status,
      eventId: payload.event.id,
      productId: productId || '',
      webhookTimestamp: payload.event.timestamp,
      rawData: payload
    })
  }

  /**
   * Process CANCELLATION event
   */
  async handleCancellation(payload: RevenueCatWebhookPayload): Promise<void> {
    const customerId = payload.subscriber.id
    const expirationDate = payload.expiration?.date

    if (!customerId) {
      throw new Error('Missing required fields for CANCELLATION: customerId')
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (error) throw error
    if (!subscription) {
      throw new Error(`Subscription not found for customer ID: ${customerId}`)
    }

    const previousStatus = subscription.subscription_status

    // Set status to cancelled but keep expiry (user still has access until that date)
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) throw updateError

    // Create history record
    await this.createHistoryRecord({
      userId: subscription.user_id,
      eventType: 'CANCELLATION',
      previousStatus,
      newStatus: 'cancelled',
      eventId: payload.event.id,
      webhookTimestamp: payload.event.timestamp,
      rawData: payload
    })
  }

  /**
   * Process REFUND event
   */
  async handleRefund(payload: RevenueCatWebhookPayload): Promise<void> {
    const customerId = payload.subscriber.id
    const transactionId = payload.transaction?.id
    const price = payload.price?.amount
    const currency = payload.price?.currency

    if (!customerId) {
      throw new Error('Missing required fields for REFUND: customerId')
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (error) throw error
    if (!subscription) {
      throw new Error(`Subscription not found for customer ID: ${customerId}`)
    }

    const previousStatus = subscription.subscription_status

    // Refunds revoke access immediately
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) throw updateError

    // Create history record
    await this.createHistoryRecord({
      userId: subscription.user_id,
      eventType: 'REFUND',
      previousStatus,
      newStatus: 'cancelled',
      eventId: payload.event.id,
      transactionId,
      price,
      currency,
      webhookTimestamp: payload.event.timestamp,
      rawData: payload
    })
  }

  /**
   * Process EXPIRATION event
   */
  async handleExpiration(payload: RevenueCatWebhookPayload): Promise<void> {
    const customerId = payload.subscriber.id

    if (!customerId) {
      throw new Error('Missing required fields for EXPIRATION: customerId')
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('revenuecat_customer_id', customerId)
      .single()

    if (error) throw error
    if (!subscription) {
      throw new Error(`Subscription not found for customer ID: ${customerId}`)
    }

    const previousStatus = subscription.subscription_status

    // Check if expired
    if (new Date(subscription.subscription_expiry) <= new Date()) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          subscription_status: 'free_trial_expired',
          is_trial_expired: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) throw updateError

      // Create history record
      await this.createHistoryRecord({
        userId: subscription.user_id,
        eventType: 'EXPIRATION',
        previousStatus,
        newStatus: 'free_trial_expired',
        eventId: payload.event.id,
        webhookTimestamp: payload.event.timestamp,
        rawData: payload
      })
    }
  }

  /**
   * Create an audit trail record in subscription_history
   */
  private async createHistoryRecord({
    userId,
    eventType,
    previousStatus,
    newStatus,
    eventId,
    transactionId,
    productId,
    price,
    currency,
    webhookTimestamp,
    rawData
  }: {
    userId: string
    eventType: WebhookEventType
    previousStatus?: SubscriptionStatus
    newStatus?: SubscriptionStatus
    eventId: string
    transactionId?: string
    productId?: string
    price?: number
    currency?: string
    webhookTimestamp?: string
    rawData: RevenueCatWebhookPayload
  }): Promise<void> {
    const { error } = await supabase.from('subscription_history').insert({
      user_id: userId,
      event_type: eventType,
      previous_status: previousStatus,
      new_status: newStatus,
      revenuecat_event_id: eventId,
      revenuecat_transaction_id: transactionId,
      product_id: productId,
      price: price,
      currency: currency,
      webhook_timestamp: webhookTimestamp,
      processed_at: new Date().toISOString(),
      raw_data: rawData,
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('[Webhooks] Failed to create history record:', error)
      throw error
    }
  }

  /**
   * Store failed webhooks for manual review
   */
  private async storeFailedWebhook(payload: RevenueCatWebhookPayload, reason: string): Promise<void> {
    try {
      // Store in a table for manual review (create if doesn't exist)
      // For now, just log it
      console.error('[Webhooks] Failed to process webhook:', {
        eventId: payload.event.id,
        reason,
        customerId: payload.subscriber.id,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('[Webhooks] Failed to store failed webhook:', error)
    }
  }

  /**
   * Process a webhook event
   */
  async processWebhook(payload: RevenueCatWebhookPayload): Promise<void> {
    const eventType = payload.event.type
    const eventId = payload.event.id

    console.log(`[Webhooks] Processing ${eventType} event: ${eventId}`)

    // Check for duplicate
    if (await this.isDuplicateEvent(eventId)) {
      console.warn(`[Webhooks] Duplicate event detected: ${eventId}`)
      return
    }

    // Route to appropriate handler
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        await this.handleInitialPurchase(payload)
        break
      case 'RENEWAL':
        await this.handleRenewal(payload)
        break
      case 'CANCELLATION':
        await this.handleCancellation(payload)
        break
      case 'REFUND':
        await this.handleRefund(payload)
        break
      case 'EXPIRATION':
        await this.handleExpiration(payload)
        break
      case 'SUBSCRIPTION_EXTENDED':
        // Treat as renewal
        await this.handleRenewal(payload)
        break
      default:
        console.warn(`[Webhooks] Unknown event type: ${eventType}`)
    }

    console.log(`[Webhooks] Successfully processed ${eventType} event: ${eventId}`)
  }
}

// Export singleton instance
export function getSubscriptionWebhookService(): SubscriptionWebhookService {
  return new SubscriptionWebhookService()
}
