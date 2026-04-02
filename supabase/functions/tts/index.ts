import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchTTS(text: string): Promise<ArrayBuffer> {
  const encoded = encodeURIComponent(text);

  // Tentativa 1: ElevenLabs (se key configurada)
  const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (elevenKey) {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/x3mAOLD9WzlmrFCwA1S3",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (res.ok) return await res.arrayBuffer();
  }

  // Tentativa 2: Google Translate TTS
  const googleUrl =
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=pt-BR&client=tw-ob`;
  const googleRes = await fetch(googleUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });
  if (googleRes.ok) return await googleRes.arrayBuffer();

  // Tentativa 3: StreamElements
  const seRes = await fetch(
    `https://api.streamelements.com/kappa/v2/speech?voice=Vitoria&text=${encoded}`
  );
  if (seRes.ok) return await seRes.arrayBuffer();

  throw new Error("Todos os provedores TTS falharam");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text) throw new Error("Parâmetro 'text' é obrigatório");

    const audio = await fetchTTS(text);
    return new Response(audio, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
