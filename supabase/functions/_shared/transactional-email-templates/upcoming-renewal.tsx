/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CossInfo'
const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface UpcomingRenewalProps {
  storeName?: string
  planName?: string
  daysLeft?: number
  amount?: string
  paymentMode?: string
}

const UpcomingRenewalEmail = ({ storeName, planName = 'Popular', daysLeft = 2, amount = '$49.99', paymentMode = 'Manual' }: UpcomingRenewalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} {planName} plan {paymentMode === 'Auto-Recurring' ? 'renews' : 'expires'} in {daysLeft} days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>Renewal Reminder 🔔</Heading>
        <Text style={text}>Hi{storeName ? ` ${storeName}` : ''},</Text>
        <Text style={text}>
          Your <strong>{planName}</strong> plan ({amount} AUD) {paymentMode === 'Auto-Recurring' ? 'will auto-renew' : 'expires'} in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
        </Text>
        {paymentMode !== 'Auto-Recurring' ? (
          <Text style={text}>
            To continue using premium features without interruption, please renew your subscription before it expires.
          </Text>
        ) : (
          <Text style={text}>
            Your payment will be processed automatically. Ensure your payment method is up to date.
          </Text>
        )}
        <Button style={button} href="https://cossinfo.lovable.app/settings">
          Manage Subscription
        </Button>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UpcomingRenewalEmail,
  subject: (data: Record<string, any>) => `Your ${data?.planName || ''} plan ${data?.paymentMode === 'Auto-Recurring' ? 'renews' : 'expires'} in ${data?.daysLeft || 2} days`,
  displayName: 'Upcoming renewal reminder',
  previewData: { storeName: 'Demo Store', planName: 'Popular', daysLeft: 2, amount: '$49.99', paymentMode: 'Manual' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(235, 50%, 25%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(230, 12%, 40%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: 'hsl(238, 52%, 33%)',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
