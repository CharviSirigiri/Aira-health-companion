// Supabase Edge Function: proxies Gemini API calls so the API key never
// ships in the client bundle (AD-2). The client sends the exact Gemini
// request body it would have sent directly (optionally with a top-level
// `model` field to target a non-default model, e.g. for TTS); this function
// strips that field, attaches the secret key server-side, and forwards the
// response unchanged.
//
// Deploy: supabase functions deploy gemini-proxy
// Secret: supabase secrets set GEMINI_API_KEY=<key>

const DEFAULT_MODEL = 'gemini-2.5-flash';

function modelUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { model, ...requestBody } = await req.json();

    const geminiResponse = await fetch(`${modelUrl(model || DEFAULT_MODEL)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await geminiResponse.text();

    // Always return 200 from this function itself — Gemini's real status/error
    // shape is embedded in the body, so supabase-js never wraps this as its
    // own FunctionsHttpError. The client checks `result.error` instead.
    return new Response(responseBody, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
