const express = require('express');
const multer = require('multer');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { env } = require('../config/env');

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function normalizeLangCode(code) {
  return String(code || 'en').split('-')[0].toLowerCase();
}

router.get('/health', async (_req, res) => {
  try {
    const result = await getSupabase().from('users').select('id').limit(1);
    throwIfSupabaseError(result.error);
    res.json({
      ok: true,
      database: 'supabase connected',
      deepgramKeyLoaded: Boolean(env.deepgramApiKey),
      openrouterKeyLoaded: Boolean(env.openrouterApiKey),
      libreTranslateUrl: env.libreTranslateUrl,
      smtpConfigured: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
      port: env.port
    });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, database: 'not connected', message: error.message });
  }
});

async function transcribeAudio(req, res) {
  try {
    if (!env.deepgramApiKey) {
      return res.status(500).json({ error: 'Deepgram API key is missing. Add DEEPGRAM_API_KEY to .env, then restart the server.' });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'No audio file was uploaded.' });
    }

    const dgResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.deepgramApiKey}`,
        'Content-Type': req.file.mimetype || 'audio/webm'
      },
      body: req.file.buffer
    });

    const payload = await dgResponse.json().catch(() => ({}));
    if (!dgResponse.ok) {
      return res.status(dgResponse.status).json({
        error: payload?.err_msg || payload?.error || 'Deepgram could not transcribe the audio.',
        details: payload
      });
    }

    res.json({
      transcript: payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
      raw: payload
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while transcribing audio.' });
  }
}

router.post('/transcribe', memoryUpload.single('audio'), transcribeAudio);
router.post('/deepgram/transcribe', memoryUpload.single('audio'), transcribeAudio);

router.post('/translate', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    const source = normalizeLangCode(req.body?.source || 'en');
    const target = normalizeLangCode(req.body?.target || 'zu');

    if (!text) return res.status(400).json({ error: 'No text was provided for translation.' });
    if (source === target) return res.json({ translatedText: text, provider: 'same-language' });

    const body = { q: text, source, target, format: 'text' };
    if (env.libreTranslateApiKey) body.api_key = env.libreTranslateApiKey;

    const ltResponse = await fetch(env.libreTranslateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await ltResponse.json().catch(() => ({}));
    if (!ltResponse.ok) {
      return res.status(ltResponse.status).json({
        error: payload?.error || payload?.message || 'LibreTranslate could not translate the text.',
        details: payload
      });
    }

    res.json({
      translatedText: payload?.translatedText || '',
      detectedLanguage: payload?.detectedLanguage || null,
      provider: 'LibreTranslate'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while translating text.' });
  }
});

async function askOpenRouterForNativeReply(text, page = 'a dashboard page') {
  if (!env.openrouterApiKey) return null;

  const models = [
    env.openrouterModel,
    'openrouter/free',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.2-3b-instruct:free'
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);

  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.appBaseUrl,
          'X-OpenRouter-Title': 'AI Natives Hey Native Assistant'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are Hey Native, the friendly voice assistant inside the AI Natives accessibility platform. Reply briefly, naturally, and helpfully like Siri. Keep answers under 3 sentences unless the user asks for detail. The user may be on ${page}. You can help them navigate, search jobs, use maps, change settings, or activate emergency assist. Do not tell the user to start with Hey Native once the message already includes it.`
            },
            { role: 'user', content: text }
          ],
          temperature: 0.6,
          max_tokens: 220
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload?.error?.message || payload?.message || `OpenRouter failed for ${model}.`;
        continue;
      }

      return payload?.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
      lastError = error.message;
    }
  }

  console.warn('OpenRouter unavailable. Falling back to local assistant:', lastError);
  return null;
}

function getNativeAction(text) {
  const lower = String(text || '').toLowerCase();
  const cleaned = lower.replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const command = cleaned.replace(/\b(hey native|hi native|hello native|native)\b/gi, '').trim();

  if (/\b(open|go to|show|take me to)\b.*\b(job|jobs|vacancies|work)\b|\b(job|jobs|vacancies)\b/.test(command)) {
    return { type: 'navigate', url: 'jobs.html' };
  }
  if (/\b(open|go to|show|take me to)\b.*\b(map|maps|navigation|directions)\b|\b(map|maps|directions)\b/.test(command)) {
    return { type: 'navigate', url: 'maps.html' };
  }
  if (/\b(open|go to|show|take me to)\b.*\b(setting|settings)\b|\b(setting|settings)\b/.test(command)) {
    return { type: 'navigate', url: 'settings.html' };
  }
  if (/\b(open|go to|show|take me to)\b.*\b(dashboard|home)\b|\b(dashboard)\b/.test(command)) {
    return { type: 'navigate', url: 'dashboard.html' };
  }
  if (/\b(emergency|help me|assist|danger|panic)\b/.test(command)) {
    return { type: 'emergency' };
  }
  return null;
}

function buildNativeAssistantReply(text, aiReply = null) {
  const original = String(text || '').trim();
  const lower = original.toLowerCase();
  const cleaned = lower.replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const heardWakeWord = /\b(hey native|hi native|hello native|native)\b/i.test(cleaned);
  const command = cleaned.replace(/\b(hey native|hi native|hello native|native)\b/gi, '').trim();
  const action = getNativeAction(original);

  let reply = '';

  if (!original) {
    reply = 'I did not hear anything. Please try again.';
  } else if (!heardWakeWord) {
    reply = 'I heard you. To activate me, start with Hey Native.';
  } else if (aiReply) {
    reply = aiReply;
    if (action?.type === 'navigate' && !/opening|open|taking|showing/i.test(reply)) reply += ' Opening it now.';
    if (action?.type === 'emergency' && !/emergency/i.test(reply)) reply += ' Emergency assist is now activated.';
  } else if (!command || /\b(help|what can you do)\b/.test(command)) {
    reply = 'Hi, I am Native. You can ask me questions, ask me to open jobs, maps, settings, dashboard, read your message, or call emergency assist.';
  } else if (action?.type === 'navigate') {
    reply = action.url.includes('jobs') ? 'Opening the jobs page now.' : action.url.includes('maps') ? 'Opening maps and navigation now.' : action.url.includes('settings') ? 'Opening your settings now.' : 'Opening your dashboard now.';
  } else if (action?.type === 'emergency') {
    reply = 'Emergency assist has been activated. Please stay calm and ask someone nearby for help if you are in immediate danger.';
  } else if (/\b(time)\b/.test(command)) {
    reply = `The time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  } else if (/\b(date|day)\b/.test(command)) {
    reply = `Today is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  } else if (/\b(read|speak|say)\b/.test(command)) {
    reply = command.replace(/\b(read|speak|say|this|message|for me)\b/g, '').trim() || 'Type a message in the text box and I will read it for you.';
  } else {
    reply = `I heard: ${command}. Add your OpenRouter key in .env to make me answer with full AI conversation.`;
  }

  return { wakeWordDetected: heardWakeWord, transcript: original, command, reply, action, aiEnabled: Boolean(aiReply) };
}

async function nativeAssistantHandler(req, res) {
  try {
    const text = String(req.body?.text || req.body?.message || '').trim();
    let aiReply = null;

    if (/\b(hey native|hi native|hello native|native)\b/i.test(text) && env.openrouterApiKey) {
      aiReply = await askOpenRouterForNativeReply(text, String(req.body?.page || 'a dashboard page'));
    }

    res.json(buildNativeAssistantReply(text, aiReply));
  } catch (error) {
    console.error(error);
    res.json(buildNativeAssistantReply(String(req.body?.text || req.body?.message || '').trim(), null));
  }
}

router.post('/native-assistant', nativeAssistantHandler);

router.post('/hey-native/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || req.body?.text || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const aiReply = await askOpenRouterForNativeReply(message, 'AI Natives polished dashboard');
    res.json({ reply: aiReply || buildNativeAssistantReply(message, null).reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Hey Native failed' });
  }
});

router.post('/assistant/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || req.body?.text || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const aiReply = await askOpenRouterForNativeReply(message, String(req.body?.page || 'AI Natives'));
    res.json({ reply: aiReply || buildNativeAssistantReply(`hey native ${message}`, null).reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Assistant failed' });
  }
});

module.exports = router;
