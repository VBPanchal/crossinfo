/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Html, Head, Body, Container, Section, Text, Hr, Heading } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  storeName: string
  ownerName: string
  storeId: string
  email: string
  contactNo: string
  plan: string
  address: string
}

function NewStoreRegistration({ storeName, ownerName, storeId, email, contactNo, plan, address }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f4f4f7', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ color: '#2d2b7f', fontSize: '22px', marginBottom: '16px' }}>🏪 New Store Registered</Heading>
          <Text style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>
            A new store has just registered on the platform.
          </Text>
          <Section style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Store Name:</strong> {storeName}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Owner:</strong> {ownerName}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Store ID:</strong> {storeId}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Email:</strong> {email}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Contact:</strong> {contactNo}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Plan:</strong> {plan}</Text>
            <Text style={{ color: '#555', fontSize: '13px', margin: '4px 0' }}><strong>Address:</strong> {address}</Text>
          </Section>
          <Hr style={{ borderColor: '#e5e5e5', margin: '20px 0' }} />
          <Text style={{ color: '#999', fontSize: '11px', textAlign: 'center' as const }}>
            CossInfo Stock Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: NewStoreRegistration,
  subject: (data) => `New Store Registration: ${data.storeName || 'Unknown'}`,
  displayName: 'New Store Registration',
  previewData: {
    storeName: 'Demo Store',
    ownerName: 'John Smith',
    storeId: 'STORE-0001',
    email: 'store@example.com',
    contactNo: '0412 345 678',
    plan: 'popular',
    address: '123 Main St, Sydney, NSW 2000',
  },
}