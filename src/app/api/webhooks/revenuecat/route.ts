import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { OperationTimer } from '@/lib/utils/performance-logger'
import { getSubscriptionWebhookService } from '@/lib/services/subscription-webhook-service'
import type { RevenueCatWebhookPayload } from '@/lib/services/subscription-webhook-service'

/**
 * RevenueCat Webhook Handler
 * Receives subscription events and updates Supabase
 *
 * Expected headers:
 * - X-RevenueCat-Signature: HMAC-SHA256 signature for validation
 *
 * Expected body: JSON webhook payload from RevenueCat
 */
export async function POST(request: NextRequest) {
  const webhookId = uuidv4()
  const timer = new OperationTimer(`RevenueCat Webhook ${webhookId}`)

  try {
    // Get webhook service
    const webhookService = getSubscriptionWebhookService()

    // Get signature from header
    const signature = request.headers.get('X-RevenueCat-Signature')
    if (!signature) {
      console.error(`[RevenueCat Webhook] Missing signature header: ${webhookId}`)
      return NextResponse.json(
        { error: 'Missing signature header', webhookId },
        { status: 401 }
      )
    }

    // Get raw request body for signature validation
    const rawBody = await request.arrayBuffer()
    const bodyBuffer = Buffer.from(rawBody)

    // Validate signature
    const isValid = webhookService.validateSignature(bodyBuffer, signature)
    if (!isValid) {
      console.error(`[RevenueCat Webhook] Invalid signature: ${webhookId}`)
      return NextResponse.json(
        { error: 'Invalid signature', webhookId },
        { status: 401 }
      )
    }

    // Parse payload
    let payload: RevenueCatWebhookPayload
    try {
      const text = new TextDecoder().decode(rawBody)
      payload = JSON.parse(text)
    } catch (error) {
      console.error(`[RevenueCat Webhook] Failed to parse payload: ${webhookId}`, error)
      return NextResponse.json(
        { error: 'Invalid JSON payload', webhookId },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!payload.event?.type || !payload.event?.id || !payload.subscriber?.id) {
      console.error(
        `[RevenueCat Webhook] Missing required fields: ${webhookId}`,
        { event: payload.event, subscriber: payload.subscriber }
      )
      return NextResponse.json(
        { error: 'Missing required fields', webhookId },
        { status: 400 }
      )
    }

    console.log(
      `[RevenueCat Webhook] Received ${payload.event.type} event: ${webhookId}`,
      { eventId: payload.event.id, customerId: payload.subscriber.id }
    )

    // Process webhook
    try {
      await webhookService.processWebhook(payload)

      console.log(
        `[RevenueCat Webhook] Successfully processed ${payload.event.type}: ${webhookId}`
      )

      return NextResponse.json(
        {
          success: true,
          webhookId,
          eventId: payload.event.id,
          processingTime: timer.getCurrentDuration()
        },
        { status: 200 }
      )
    } catch (error: any) {
      // Check if it's a "user not found" error
      if (error.message?.includes('not found')) {
        console.warn(
          `[RevenueCat Webhook] User not found, storing for manual review: ${webhookId}`,
          { customerId: payload.subscriber.id, error: error.message }
        )

        // Return 202 ACCEPTED so RevenueCat doesn't retry
        return NextResponse.json(
          {
            success: false,
            reason: 'User subscription not found',
            webhookId,
            eventId: payload.event.id,
            processingTime: timer.getCurrentDuration()
          },
          { status: 202 }
        )
      }

      // For other errors, log and return 500
      console.error(
        `[RevenueCat Webhook] Processing error: ${webhookId}`,
        { error: error.message }
      )

      return NextResponse.json(
        {
          error: 'Failed to process webhook',
          webhookId,
          message: error?.message || 'Unknown error',
          processingTime: timer.getCurrentDuration()
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error(`[RevenueCat Webhook] Unexpected error: ${webhookId}`, error)

    return NextResponse.json(
      {
        error: 'Unexpected error',
        webhookId,
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint for webhook configuration
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      webhook: 'revenucat',
      message: 'POST requests only',
      expectedHeaders: ['X-RevenueCat-Signature'],
      environment: {
        publicKeyConfigured: !!process.env.REVENUECAT_PUBLIC_KEY
      }
    },
    { status: 200 }
  )
}
