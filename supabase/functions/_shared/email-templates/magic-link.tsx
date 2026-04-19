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

const LOGO_URL = 'https://gekhjpoihyiylonhlbfy.supabase.co/storage/v1/object/public/store-profiles/email-assets/logo.svg'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => {
  // Extract token from confirmationUrl if not provided directly
  const otpCode = token || (() => {
    try {
      const url = new URL(confirmationUrl);
      return url.searchParams.get('token') || '';
    } catch {
      return '';
    }
  })();

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your login code for {siteName}: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="CossInfo" width="120" height="40" style={{ margin: '0 0 24px' }} />
          <Heading style={h1}>Your Login Code</Heading>
          <Text style={text}>
            Use the following code to log in to {siteName}. This code
            will expire in 5 minutes.
          </Text>
          {otpCode ? (
            <div style={codeContainer}>
              <Text style={codeText}>{otpCode}</Text>
            </div>
          ) : null}
          <Text style={footer}>
            If you didn't request this code, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2a2563', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#596066', lineHeight: '1.5', margin: '0 0 25px' }
const codeContainer = { backgroundColor: '#f4f3ff', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, margin: '0 0 25px', border: '2px dashed #353280' }
const codeText = { fontSize: '36px', fontWeight: 'bold' as const, color: '#353280', letterSpacing: '0.3em', margin: '0', fontFamily: "'Courier New', monospace" }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
