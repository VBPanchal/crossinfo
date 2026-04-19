import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, contactNo, phoneNumber, storeId } = await req.json();
    const customerPhone = contactNo ?? phoneNumber;

    if (!email || !storeId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing email or storeId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customerPhone) {
      return new Response(JSON.stringify({ success: false, error: 'Missing contactNo or phoneNumber' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in database
    const { error: dbError } = await supabase.from('customer_otp_codes').insert({
      phone_number: email,
      code,
      store_id: storeId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    // Format phone number - ensure E.164
    let formattedPhoneNumber = customerPhone.replace(/\s+/g, '');
    if (formattedPhoneNumber.startsWith('0') && !formattedPhoneNumber.startsWith('00')) {
      formattedPhoneNumber = '+61' + formattedPhoneNumber.substring(1);
    } else if (!formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = '+' + formattedPhoneNumber;
    }

    const smsBody = `Your CossInfo verification code is: ${code}\nThis code expires in 5 minutes. Do not share this code with anyone.`;

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
        To: formattedPhoneNumber,
        From: TWILIO_FROM_NUMBER,
        Body: smsBody,
      }),
    });

    if (!smsResponse.ok) {
      const smsText = await smsResponse.text();
      console.error('Twilio SMS error:', smsText);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send SMS verification code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      smsSent: true,
      message: 'Verification code sent to customer via SMS.'
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error generating OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
