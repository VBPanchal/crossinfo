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
    const { email, contactNo, type } = await req.json();

    if (type !== 'email' && type !== 'sms') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid type. Must be email or sms' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'email') {
      return new Response(JSON.stringify({ success: false, error: 'Email OTP is handled directly by the sign-up flow.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contactNo) {
      return new Response(JSON.stringify({ success: false, error: 'Missing contactNo' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    if (!TWILIO_ACCOUNT_SID) throw new Error('TWILIO_ACCOUNT_SID is not configured');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!TWILIO_AUTH_TOKEN) throw new Error('TWILIO_AUTH_TOKEN is not configured');
    const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!TWILIO_FROM_NUMBER) throw new Error('TWILIO_FROM_NUMBER is not configured');

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Format phone number - ensure E.164
    let phoneNumber = contactNo.replace(/\s+/g, '');
    if (phoneNumber.startsWith('0') && !phoneNumber.startsWith('00')) {
      phoneNumber = '+61' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    const smsBody = `Your CossInfo registration verification code is: ${code}\nThis code expires in 5 minutes.`;

    // Direct call to Twilio AU1 region API
    const twilioUrl = `https://api.au1.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const smsResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_FROM_NUMBER,
        Body: smsBody,
      }),
    });

    if (!smsResponse.ok) {
      const smsText = await smsResponse.text();
      console.error('Twilio SMS error:', smsText);

      if (smsText.includes('21608') || smsText.includes('unverified')) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Twilio trial account: recipient number must be verified.' 
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: false, error: 'Failed to send SMS' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, code, message: 'SMS OTP sent' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
