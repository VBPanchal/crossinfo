/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as supportEscalation } from './support-escalation.tsx'
import { template as settingsAccessNotification } from './settings-access-notification.tsx'
import { template as planDowngrade } from './plan-downgrade.tsx'
import { template as paymentSuccess } from './payment-success.tsx'
import { template as trialExpiryReminder } from './trial-expiry-reminder.tsx'
import { template as stockReport } from './stock-report.tsx'
import { template as newStoreRegistration } from './new-store-registration.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as upcomingRenewal } from './upcoming-renewal.tsx'
import { template as welcomeStore } from './welcome-store.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'support-escalation': supportEscalation,
  'settings-access-notification': settingsAccessNotification,
  'plan-downgrade': planDowngrade,
  'payment-success': paymentSuccess,
  'trial-expiry-reminder': trialExpiryReminder,
  'stock-report': stockReport,
  'new-store-registration': newStoreRegistration,
  'payment-failed': paymentFailed,
  'upcoming-renewal': upcomingRenewal,
  'welcome-store': welcomeStore,
}
