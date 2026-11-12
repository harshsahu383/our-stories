import OpenAI from 'openai';
import fs from 'node:fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const languageDetails = {
  en: {
    name: 'English',
    script: 'Latin script',
    transcriptionPrompt: 'The speaker is speaking English. Transcribe faithfully in standard English using Latin script.',
    followUpInstruction: 'Write the question in natural English using Latin script.'
  },
  hi: {
    name: 'Hindi',
    script: 'Devanagari script (देवनागरी)',
    transcriptionPrompt: 'The speaker is speaking Hindi as used in India. IMPORTANT: write the transcript in Devanagari script (हिन्दी), never in Urdu or Arabic script. Preserve the exact Hindi words spoken. Do not translate the speech.',
    followUpInstruction: 'Write the question in natural Hindi using Devanagari script only. Do not use Urdu or Arabic script.'
  },
  gu: {
    name: 'Gujarati',
    script: 'Gujarati script (ગુજરાતી)',
    transcriptionPrompt: 'The speaker is speaking Gujarati. IMPORTANT: write the transcript in Gujarati script (ગુજરાતી). Preserve the exact Gujarati words spoken. Do not translate the speech.',
    followUpInstruction: 'Write the question in natural Gujarati using Gujarati script only.'
  }
};

function containsArabicScript(text) {
  return /\\p{Script=Arabic}/u.test(text || '');
}

async function normalizeTranscriptScript(text, language) {
  const details = languageDetails[language];
  if (!details || language === 'en') return text;

  const wrongScript =
    (language === 'hi' && containsArabicScript(text)) ||
    (language === 'gu' && containsArabicScript(text));

  if (!wrongScript) return text;

  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    input: `The following is a speech transcript of spoken ${details.name}, but it was mistakenly written using an incorrect writing system. Convert it into ${details.script}. This is transliteration/script correction, NOT translation. Preserve the original spoken words, wording, order, meaning, names and hesitations. Do not summarize, embellish, or add anything. Return only the corrected transcript.\n\n${text}`
  });
  return response.output_text?.trim() || text;
}

export async function transcribeAudio(filePath, language) {
  const file = fs.createReadStream(filePath);
  const details = languageDetails[language] || languageDetails.en;
  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
    ...(language && language !== 'auto' ? { language } : {}),
    prompt: details.transcriptionPrompt
  });

  const rawText = result.text?.trim() || '';
  if (!rawText) return '';
  return normalizeTranscriptScript(rawText, language);
}

export async function translateToEnglish(text, sourceLanguage) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    input: `Translate the following spoken story into natural, faithful English. Preserve the speaker's meaning, emotion, names and personal details. Do not summarize or add information. Return only the translation. Source language: ${sourceLanguage || 'auto-detect'}.\n\n${text}`
  });
  return response.output_text?.trim() || '';
}

export async function createFollowUp({ question, answer, language }) {
  const details = languageDetails[language] || languageDetails.en;
  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    input: `You are a warm, patient family storyteller. The speaker may be an older adult. Based on the current question and answer, write ONE gentle, specific follow-up question that invites a memory without pressure. Do not repeat the answer. ${details.followUpInstruction} Return only the question.\nQuestion: ${question}\nAnswer: ${answer}`
  });
  return response.output_text?.trim() || '';
}
