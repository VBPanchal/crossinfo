/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Html, Head, Body, Container, Section, Text, Hr, Heading, Button, Preview } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  storeName?: string
  ownerName?: string
  storeId?: string
  plan?: string
}

const SITE_NAME = 'CossInfo'

function WelcomeStoreEmail({ storeName, ownerName, storeId, plan }: Props) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to {SITE_NAME} – your store is ready!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Welcome to {SITE_NAME}!</Heading>
          <Text style={text}>
            {ownerName ? `Hi ${ownerName},` : 'Hi there,'}
          </Text>
          <Text style={text}>
            Thank you for registering <strong>{storeName || 'your store'}</strong> on {SITE_NAME}. Your store is now set up and ready to go!
          </Text>

          <Section style={detailsBox}>
            <Text style={detailText}><strong>Store ID:</strong> {storeId || '—'}</Text>
            <Text style={detailText}><strong>Store Name:</strong> {storeName || '—'}</Text>
            <Text style={detailText}><strong>Plan:</strong> {(plan || 'free').charAt(0).toUpperCase() + (plan || 'free').slice(1)}</Text>
          </Section>

          <Text style={text}>
            Here's what you can do next:
          </Text>
          <Section style={stepsBox}>
            <Text style={stepText}>✅ Log in to your dashboard</Text>
            <Text style={stepText}>✅ Add your products to the library</Text>
            <Text style={stepText}>✅ Start scanning &amp; managing stock</Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button style={button} href="https://cossinfo.lovable.app/login">
              Go to Dashboard
            </Button>
          </Section>

          <Text style={text}>
            If you have any questions, feel free to reach out through the Help Center in your dashboard.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Welcome aboard! — The {SITE_NAME} Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeStoreEmail,
  subject: (data: Record<string, any>) => `Welcome to CossInfo, ${data.storeName || 'Store Owner'}!`,
  displayName: 'Welcome – New Store Registration',
  previewData: {
    storeName: 'Demo Store',
    ownerName: 'John Smith',
    storeId: 'STORE-0001',
    plan: 'starter',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2d2b7f', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f0f0ff', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const detailText = { fontSize: '13px', color: '#555555', margin: '4px 0' }
const stepsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const stepText = { fontSize: '13px', color: '#333333', margin: '6px 0' }
const button = {
  backgroundColor: '#2d2b7f',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '0' }
