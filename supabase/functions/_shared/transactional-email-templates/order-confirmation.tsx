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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CossInfo'
const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface OrderConfirmationProps {
  customerName?: string
  collectionNumber?: string
  orderType?: string
  storeName?: string
}

const OrderConfirmationEmail = ({
  customerName,
  collectionNumber,
  orderType,
  storeName,
}: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your order has been received — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="CossInfo" width="120" height="40" style={logo} />
        <Heading style={h1}>
          {customerName ? `Thanks, ${customerName}!` : 'Order Confirmed!'}
        </Heading>
        <Text style={text}>
          Your {orderType ?? 'pickup'} order{storeName ? ` at ${storeName}` : ''} has been received and is being processed.
        </Text>
        {collectionNumber && (
          <Text style={codeStyle}>Collection #: {collectionNumber}</Text>
        )}
        <Text style={text}>
          You'll receive updates as your order progresses. Please show your collection number when picking up.
        </Text>
        <Text style={footer}>
          This is an automated email from {SITE_NAME}. Please do not reply.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: 'Your order has been confirmed',
  displayName: 'Order confirmation',
  previewData: {
    customerName: 'Jane',
    collectionNumber: 'ORD-1234',
    orderType: 'pickup',
    storeName: 'Demo Store',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2a2563', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#596066', lineHeight: '1.5', margin: '0 0 25px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#353280',
  backgroundColor: '#f4f3ff',
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
