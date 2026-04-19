import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    if (!TWILIO_ACCOUNT_SID) throw new Error('TWILIO_ACCOUNT_SID is not configured');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!TWILIO_AUTH_TOKEN) throw new Error('TWILIO_AUTH_TOKEN is not configured');
    const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!TWILIO_FROM_NUMBER) throw new Error('TWILIO_FROM_NUMBER is not configured');

    const { to, status, customerName, collectionNumber, adminNotes, storeName } = await req.json();

    if (!to || !status || !customerName) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: to, status, customerName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone number - ensure E.164
    let phoneNumber = to.replace(/\s+/g, '');
    if (phoneNumber.startsWith('0') && !phoneNumber.startsWith('00')) {
      phoneNumber = '+61' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    // Build SMS body
    let body = '';
    if (status === 'approved') {
      body = `Hi ${customerName}, your order from ${storeName || 'our store'} has been APPROVED! 🎉`;
      if (collectionNumber) {
        body += `\nYour collection number is: ${collectionNumber}`;
      }
      if (adminNotes) {
        body += `\nNote: ${adminNotes}`;
      }
      body += '\nThank you for your order!';
    } else {
      body = `Hi ${customerName}, unfortunately your order from ${storeName || 'our store'} has been declined.`;
      if (adminNotes) {
        body += `\nReason: ${adminNotes}`;
      }
      body += '\nPlease contact the store for more details.';
    }

    // Direct call to Twilio AU1 region API
    const twilioUrl = `https://api.au1.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_FROM_NUMBER,
        Body: body,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Twilio API error:', data);
      throw new Error(`Twilio API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, messageSid: data.sid }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
