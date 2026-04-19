/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CossInfo'
const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface PaymentFailedProps {
  storeName?: string
  planName?: string
  attemptNumber?: number
  remainingRetries?: number
}

const PaymentFailedEmail = ({ storeName, planName = 'Popular', attemptNumber = 1, remainingRetries = 2 }: PaymentFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment failed for your {SITE_NAME} {planName} plan</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>Payment Failed ⚠️</Heading>
        <Text style={text}>Hi{storeName ? ` ${storeName}` : ''},</Text>
        <Text style={text}>
          We were unable to process your payment for the <strong>{planName}</strong> plan (attempt #{attemptNumber}).
        </Text>
        {remainingRetries > 0 ? (
          <Text style={text}>
            We'll automatically retry <strong>{remainingRetries} more time{remainingRetries !== 1 ? 's' : ''}</strong>. 
            Please ensure your payment method is up to date to avoid service interruption.
          </Text>
        ) : (
          <Text style={text}>
            This was our <strong>final retry attempt</strong>. Your account will be downgraded to the Free plan shortly. 
            To restore your subscription, please renew from Settings → Plan & Billing.
          </Text>
        )}
        <Button style={button} href="https://cossinfo.lovable.app/settings">
          Update Payment Method
        </Button>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: (data: Record<string, any>) => `Payment failed for your ${data?.planName || 'subscription'} — action required`,
  displayName: 'Payment failed notification',
  previewData: { storeName: 'Demo Store', planName: 'Popular', attemptNumber: 1, remainingRetries: 2 },
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
