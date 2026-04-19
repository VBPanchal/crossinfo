import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CossInfo"

interface SupportEscalationProps {
  storeName?: string
  storeId?: string
  storeEmail?: string
  chatHistory?: string
}

const SupportEscalationEmail = ({ storeName, storeId, storeEmail, chatHistory }: SupportEscalationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New support request from {storeName || 'a store'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎧 New Support Request</Heading>
        <Text style={text}>
          A store has requested human support through the chatbot.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Store Name</Text>
          <Text style={detailValue}>{storeName || 'Unknown'}</Text>
          <Text style={detailLabel}>Store ID</Text>
          <Text style={detailValue}>{storeId || 'Unknown'}</Text>
          <Text style={detailLabel}>Email</Text>
          <Text style={detailValue}>{storeEmail || 'Unknown'}</Text>
        </Section>
        {chatHistory && (
          <>
            <Hr style={hr} />
            <Text style={detailLabel}>Chat History</Text>
            <Section style={chatBox}>
              <Text style={chatText}>{chatHistory}</Text>
            </Section>
          </>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Please respond to this request in the Developer Panel → Support tab.
        </Text>
        <Text style={footer}>— {SITE_NAME} Support System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportEscalationEmail,
  subject: (data: Record<string, any>) => `🎧 Support Request from ${data.storeName || 'Store'}`,
  displayName: 'Support escalation notification',
  previewData: {
    storeName: 'Demo Store',
    storeId: 'STORE-0001',
    storeEmail: 'demo@example.com',
    chatHistory: 'User asked about billing\nUser asked about plan upgrade',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2d2b6b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f5f5ff', borderRadius: '8px', padding: '16px', margin: '0 0 16px' }
const detailLabel = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#2d2b6b', margin: '0 0 12px', fontWeight: '500' as const }
const chatBox = { backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '12px', border: '1px solid #eee' }
const chatText = { fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap' as const, margin: '0', lineHeight: '1.5' }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
