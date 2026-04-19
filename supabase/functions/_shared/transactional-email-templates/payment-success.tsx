/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CossInfo'
const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface PaymentSuccessProps {
  storeName?: string
  planName?: string
  billingCycle?: string
  amount?: string
  paymentMode?: string
}

const PaymentSuccessEmail = ({
  storeName,
  planName = 'Popular',
  billingCycle = 'Monthly',
  amount = '$49.99',
  paymentMode = 'One-time',
}: PaymentSuccessProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment confirmed — {planName} plan activated on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>Payment Successful! 🎉</Heading>
        <Text style={text}>
          Hi{storeName ? ` ${storeName}` : ''},
        </Text>
        <Text style={text}>
          Your payment has been processed successfully. Here are the details:
        </Text>
        <div style={detailsBox}>
          <Text style={detailRow}><strong>Plan:</strong> {planName}</Text>
          <Text style={detailRow}><strong>Billing Cycle:</strong> {billingCycle}</Text>
          <Text style={detailRow}><strong>Amount Paid:</strong> {amount} AUD</Text>
          <Text style={detailRow}><strong>Payment Type:</strong> {paymentMode}</Text>
        </div>
        <Text style={text}>
          Your plan is now active. Enjoy all the premium features!
        </Text>
        <Button style={button} href="https://cossinfo.lovable.app/settings">
          View Your Plan
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentSuccessEmail,
  subject: (data: Record<string, any>) =>
    `Payment confirmed — ${data?.planName || 'Plan'} activated`,
  displayName: 'Payment success receipt',
  previewData: { storeName: 'Demo Store', planName: 'Popular', billingCycle: 'Monthly', amount: '$49.99', paymentMode: 'One-time' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(235, 50%, 25%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(230, 12%, 40%)', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '16px' }
const detailRow = { fontSize: '13px', color: 'hsl(230, 12%, 40%)', margin: '0 0 6px', lineHeight: '1.5' }
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
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
