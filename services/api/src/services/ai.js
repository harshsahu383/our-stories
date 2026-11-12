
import OpenAI from 'openai';
import fs from 'node:fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LANGUAGE_SETTINGS = {
  en: {
    name: 'English',
    transcriptionPrompt:
      'The speaker is speaking English. Transcribe exactly in standard English using Latin script. Do not translate, summarize, or change the meaning.',
  },
  hi: {
    name: 'Hindi',
    transcriptionPrompt:
      'The speaker is speaking Hindi, possibly with some English words. This is NOT Urdu. Transcribe the actual spoken words in Hindi using Devanagari script. Do not translate. Do not use Urdu or Arabic script. Preserve names and English words naturally.',
  },
  gu: {
    name: 'Gujarati',
    transcriptionPrompt:
      'The speaker is speaking Gujarati, possibly with some English words. Transcribe the actual spoken words in Gujarati using Gujarati script. Do not translate. Do not use Hindi, Urdu, or Arabic script. Preserve names and English words naturally.',
  },
};

export async function transcribeAudio(filePath, language = 'auto') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing from the server environment.');
  }

  const settings = LANGUAGE_SETTINGS[language];

  const file = fs.createReadStream(filePath);

  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    ...(settings ? { language } : {}),
    ...(settings ? { prompt: settings.transcriptionPrompt } : {}),
  });

  const transcript = result.text?.trim();

  if (!transcript) {
    throw new Error('No speech was detected in this recording.');
  }

  return transcript;
}

export async function translateToEnglish(text, sourceLanguage) {
  if (!text?.trim()) {
    throw new Error('There is no transcript to translate.');
  }

  const languageName =
    LANGUAGE_SETTINGS[sourceLanguage]?.name ||
    'the original spoken language';

  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    input: `
You are a professional translator.

The original speaker was speaking ${languageName}.
Translate the transcription below into natural, faithful English.

Important instructions:
- Treat the source as ${languageName}, even if the transcription has been written in an unexpected script.
- If the Hindi speech was mistakenly transcribed using Urdu script, interpret it as spoken Hindi where possible.
- If the Gujarati speech was mistakenly transcribed using another script, interpret it as spoken Gujarati where possible.
- Preserve the speaker's actual meaning, emotion, and tone.
- Preserve names, places, relationships, and personal details.
- Keep English words and phrases natural.
- Do not summarize.
- Do not add information.
- Do not omit meaningful details.
- Do not output Urdu, Hindi, or Gujarati.
- Return only the final English translation.

Transcription:
${text}
`,
  });

  const translation = response.output_text?.trim();

  if (!translation) {
    throw new Error('The English translation could not be generated.');
  }

  return translation;
}

export async function createFollowUp({ question, answer, language }) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    input: `
You are a warm, patient family storyteller.

The speaker may be an older adult. Based on the current question and answer, write ONE gentle, specific follow-up question that invites a memory without pressure.

Do not repeat the answer.
Use language code ${language}.
Return only the question.

Question: ${question}
Answer: ${answer}
`,
  });

  return response.output_text?.trim() || '';
}
