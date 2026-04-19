import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CossInfo"

interface SettingsAccessProps {
  storeName?: string
  sectionName?: string
  accessTime?: string
}

const SettingsAccessNotificationEmail = ({ storeName, sectionName, accessTime }: SettingsAccessProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Settings accessed: {sectionName || 'section'} at {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Settings Access Notification</Heading>
        <Text style={text}>
          This is a security notification to let you know that a protected section of your store settings was accessed.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Store</Text>
          <Text style={detailValue}>{storeName || 'Your Store'}</Text>
          <Text style={detailLabel}>Section Accessed</Text>
          <Text style={detailValue}>{sectionName || 'Settings'}</Text>
          <Text style={detailLabel}>Time</Text>
          <Text style={detailValue}>{accessTime || new Date().toLocaleString()}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={text}>
          If this was you, no action is needed. If you didn't make this access, please change your password immediately.
        </Text>
        <Text style={footer}>— {SITE_NAME} Security</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SettingsAccessNotificationEmail,
  subject: (data: Record<string, any>) => `🔐 Settings Access: ${data.sectionName || 'Settings'} — ${SITE_NAME}`,
  displayName: 'Settings access notification',
  previewData: {
    storeName: 'Demo Store',
    sectionName: 'Store Details',
    accessTime: '28/03/2026, 2:30 PM',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2d2b6b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f5f5ff', borderRadius: '8px', padding: '16px', margin: '0 0 16px' }
const detailLabel = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#2d2b6b', margin: '0 0 12px', fontWeight: '500' as const }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
