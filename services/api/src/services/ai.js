
import OpenAI from 'openai';
import fs from 'node:fs';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing from the server environment.');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Transcribes speech in its actual spoken language.
 * Do not pass the session language: the speaker may use another language.
 */
export async function transcribeAudio(filePath) {
  const openai = getOpenAI();
  const file = fs.createReadStream(filePath);

  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe',
    prompt:
      'Transcribe the speech faithfully in the language actually spoken. ' +
      'Do not translate, summarize, or rewrite. Preserve names, places, ' +
      'personal details, and natural code-switching between languages.'
  });

  const transcript = result.text?.trim();

  if (!transcript) {
    throw new Error('No speech was detected in this recording.');
  }

  return transcript;
}

/**
 * Converts any supported source-language transcript into English.
 */
export async function translateToEnglish(text) {
  if (!text?.trim()) {
    throw new Error('There is no transcript to translate.');
  }

  const openai = getOpenAI();

  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    instructions:
      'You are a highly accurate translator of personal spoken stories. ' +
      'Translate the input into natural, faithful English. The source may ' +
      'be Hindi, Gujarati, English, or another language, including mixed ' +
      'language speech. Preserve the speaker’s meaning, emotion, names, ' +
      'relationships, dates, places, and personal details. Do not summarize, ' +
      'invent information, or omit meaningful details. Return only English.',
    input: text
  });

  const translation = response.output_text?.trim();

  if (!translation) {
    throw new Error('The English translation could not be generated.');
  }

  return translation;
}

export async function createFollowUp({ question, answer, language }) {
  const languageNames = {
    en: 'English',
    hi: 'Hindi',
    gu: 'Gujarati'
  };

  const openai = getOpenAI();

  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    instructions:
      'You are a warm, patient family storyteller. Write exactly one ' +
      'gentle, specific follow-up question. Do not pressure the speaker ' +
      'or repeat their answer. Return only the question.',
    input:
      `Write the question in ${languageNames[language] || 'English'}.\n` +
      `Current question: ${question}\n` +
      `Answer: ${answer}`
  });

  return response.output_text?.trim() || '';
}
