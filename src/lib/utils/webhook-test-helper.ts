/**
 * Webhook Test Helper
 * Utilities for testing RevenueCat webhook signature validation and event processing
 *
 * Usage:
 * 1. For local testing: Use generateTestSignature() and createTestPayload()
 * 2. For staging: Use RevenueCat dashboard's "Send Test Event" feature
 */

import crypto from 'crypto'

/**
 * Generate a valid HMAC-SHA256 signature for testing
 * This matches the signature format RevenueCat uses
 */
export function generateTestSignature(payload: object, publicKey: string): string {
  const payloadString = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', publicKey)
    .update(payloadString)
    .digest('base64')

  return signature
}

/**
 * Create a mock INITIAL_PURCHASE webhook payload
 */
export function createMockInitialPurchasePayload(
  customerId: string,
  productId: string = 'examgenie_weekly'
): object {
  const now = new Date()
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  return {
    event: {
      type: 'INITIAL_PURCHASE',
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: now.toISOString()
    },
    app: {
      name: 'ExamGenie'
    },
    subscriber: {
      id: customerId
    },
    product: {
      id: productId,
      type: 'subscription'
    },
    price: {
      amount: productId === 'examgenie_annual' ? 49.99 : 4.99,
      currency: 'USD'
    },
    transaction: {
      id: `txn-${Date.now()}`,
      purchaseDate: now.toISOString()
    },
    expiration: {
      date: expiryDate.toISOString()
    }
  }
}

/**
 * Create a mock RENEWAL webhook payload
 */
export function createMockRenewalPayload(
  customerId: string,
  productId: string = 'examgenie_weekly'
): object {
  const now = new Date()
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  return {
    event: {
      type: 'RENEWAL',
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: now.toISOString()
    },
    subscriber: {
      id: customerId
    },
    product: {
      id: productId,
      type: 'subscription'
    },
    expiration: {
      date: expiryDate.toISOString()
    }
  }
}

/**
 * Create a mock CANCELLATION webhook payload
 */
export function createMockCancellationPayload(
  customerId: string,
  productId: string = 'examgenie_weekly'
): object {
  const now = new Date()
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  return {
    event: {
      type: 'CANCELLATION',
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: now.toISOString()
    },
    subscriber: {
      id: customerId
    },
    product: {
      id: productId,
      type: 'subscription'
    },
    expiration: {
      date: expiryDate.toISOString(),
      cancellationReason: 'UNSUBSCRIBE'
    }
  }
}

/**
 * Create a mock REFUND webhook payload
 */
export function createMockRefundPayload(
  customerId: string,
  productId: string = 'examgenie_weekly'
): object {
  const now = new Date()

  return {
    event: {
      type: 'REFUND',
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: now.toISOString()
    },
    subscriber: {
      id: customerId
    },
    product: {
      id: productId,
      type: 'subscription'
    },
    transaction: {
      id: `txn-${Date.now()}`
    },
    price: {
      amount: productId === 'examgenie_annual' ? 49.99 : 4.99,
      currency: 'USD'
    }
  }
}

/**
 * Create a mock EXPIRATION webhook payload
 */
export function createMockExpirationPayload(customerId: string): object {
  const now = new Date()

  return {
    event: {
      type: 'EXPIRATION',
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: now.toISOString()
    },
    subscriber: {
      id: customerId
    }
  }
}

/**
 * Example curl command for testing locally
 */
export function printCurlExample(webhookUrl: string, signature: string, payload: object): void {
  const payloadString = JSON.stringify(payload)

  console.log(`
curl -X POST ${webhookUrl} \\
  -H "X-RevenueCat-Signature: ${signature}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadString}'
  `)
}

/**
 * Testing Checklist
 * Run these tests to verify webhook implementation
 */
export const WEBHOOK_TEST_CHECKLIST = {
  signature: [
    'Valid signature → Accepted',
    'Invalid signature → 401 Rejected',
    'Missing signature → 401 Rejected',
    'Tampered payload → 401 Rejected'
  ],
  events: {
    initial_purchase: [
      'New subscription created',
      'Status set to "premium_weekly" or "premium_annual"',
      'Expiry date set correctly',
      'History record created',
      'Currency and country stored'
    ],
    renewal: [
      'Existing subscription updated (not new record)',
      'Expiry date extended',
      'Status unchanged',
      'History record created'
    ],
    cancellation: [
      'Status set to "cancelled"',
      'Expiry date NOT changed',
      'History record created with previous_status',
      'User still has access until expiry'
    ],
    refund: [
      'Status set to "cancelled"',
      'Access revoked immediately',
      'History record created'
    ]
  },
  edge_cases: [
    'Duplicate event sent twice → Only processed once',
    'Same event returns 200 OK both times (idempotent)',
    'Only one history record created',
    'User not found → Returns 202 ACCEPTED',
    'Error logged correctly',
    'Webhook stored for manual review'
  ]
}
