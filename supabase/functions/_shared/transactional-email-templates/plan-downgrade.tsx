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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CossInfo'
const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface PlanDowngradeProps {
  storeName?: string
  previousPlan?: string
  reason?: string
}

const PlanDowngradeEmail = ({
  storeName,
  previousPlan = 'Popular',
  reason = 'subscription expired',
}: PlanDowngradeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} plan has been downgraded to Free</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>Plan Downgraded</Heading>
        <Text style={text}>
          Hi{storeName ? ` ${storeName}` : ''},
        </Text>
        <Text style={text}>
          Your <strong>{previousPlan}</strong> plan has been downgraded to the <strong>Free</strong> plan because your {reason}.
        </Text>
        <Text style={text}>
          On the Free plan, you're limited to 500 SKUs and won't have access to premium features like community chat and QR ordering.
        </Text>
        <Text style={text}>
          To restore your plan and features, upgrade anytime from your Settings → Plan & Billing page.
        </Text>
        <Button style={button} href="https://cossinfo.lovable.app/settings">
          Upgrade Now
        </Button>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlanDowngradeEmail,
  subject: (data: Record<string, any>) =>
    `Your ${data?.previousPlan || ''} plan has been downgraded`.trim(),
  displayName: 'Plan downgrade notification',
  previewData: { storeName: 'Demo Store', previousPlan: 'Popular', reason: 'subscription expired' },
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
