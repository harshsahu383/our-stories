
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

let authToken: string | null = null;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const callerSignal = options.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) {
    controller.abort();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Request failed (${response.status})`
      );
    }

    return data as T;
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) {
      throw new Error(
        'The server took too long to respond. Check that the API is running and reachable from your device.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export type StoryQuestion = {
  id: string;
  text: string;
  language: string;
  categoryId: string;
  category?: {
    id: string;
  };
};

export type AnswerType =
  | 'MAIN'
  | 'PERMANENT_FOLLOW_UP'
  | 'AI_FOLLOW_UP';

export type StoryPrompt = {
  id: string;
  sessionId: string;
  questionId: string;
  permanentFollowUpText: string;
  aiFollowUpText: string | null;
  aiFollowUpStatus: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  sortOrder: number;
  question: StoryQuestion;
};

export type Recording = {
  id: string;
  originalAudioUrl: string;
  originalAudioKey?: string | null;
  mimeType: string;
  status: string;
  originalTranscript?: string | null;
  englishTranslation?: string | null;
  detectedLanguage?: string | null;
  processingError?: string | null;
  createdAt?: string;
};

export type Memory = {
  id: string;
  title: string;
  transcript: string;
  translation: string | null;
  createdAt: string;
  recording?: Recording;
};

export async function startDemoSession(
  language: 'en' | 'hi' | 'gu'
) {
  const result = await request<{
    token: string;
    user: {
      id: string;
      name?: string;
      email?: string;
    };
  }>('/dev/session', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Storyteller',
      email: 'demo@ourstories.local',
      language,
    }),
  });

  authToken = result.token;

  return result.user;
}

export async function getQuestions(
  language: 'en' | 'hi' | 'gu',
  category?: string
) {
  const query = new URLSearchParams({
    language,
    ...(category ? { category } : {}),
  });

  return request<{
    questions: StoryQuestion[];
  }>(`/questions?${query.toString()}`);
}

export async function createStorySession(
  questionId: string | undefined,
  language: 'en' | 'hi' | 'gu'
) {
  return request<{
    session: {
      id: string;
    };
  }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      questionId,
      language,
    }),
  });
}

/**
 * Upload the original audio only.
 * No transcription or translation happens here.
 */

export type StoryPromptRecording = {
  id: string;
  answerType: AnswerType;
  status: string;
  englishTranslation: string | null;
  processingError: string | null;
  createdAt: string;
};

export type StoryPromptDetails = StoryPrompt & {
  recordings: StoryPromptRecording[];
};

/**
 * Upload the original audio with its StoryPrompt and answer type.
 * AI processing happens on the backend after upload.
 */
export async function uploadRecording(
  sessionId: string,
  uri: string,
  filename: string,
  storyPromptId: string,
  answerType: AnswerType
): Promise<Recording> {
  if (!uri) {
    throw new Error('No audio recording was found on this device.');
  }

  if (!storyPromptId) {
    throw new Error('Story prompt ID is missing.');
  }

  if (!['MAIN', 'PERMANENT_FOLLOW_UP', 'AI_FOLLOW_UP'].includes(answerType)) {
    throw new Error('Invalid answer type.');
  }

  if (!authToken) {
    throw new Error('Authentication token is missing. Please restart the app session.');
  }

  console.log('Uploading recording:', {
    sessionId,
    storyPromptId,
    answerType,
    filename,
  });

  const result = await FileSystem.uploadAsync(
    `${API_URL}/api/sessions/${sessionId}/recordings`,
    uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: 'audio/m4a',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      parameters: {
        storyPromptId,
        answerType,
        filename,
      },
    }
  );

  let data: {
    recording?: Recording;
    error?: string;
    message?: string;
  } = {};

  try {
    data = result.body ? JSON.parse(result.body) : {};
  } catch {
    throw new Error(
      `The server returned an unreadable response (HTTP ${result.status}).`
    );
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      data.error ||
      data.message ||
      `Audio upload failed (HTTP ${result.status}).`
    );
  }

  if (!data.recording) {
    throw new Error(
      data.error || 'The server did not return the saved recording.'
    );
  }

  return data.recording;
}


/**
 * Explicitly review a saved recording.
 * This is the ONLY mobile API function that triggers AI processing.
 */
export async function reviewRecording(
  recordingId: string
): Promise<Recording> {
  return request<{
    recording: Recording;
    message?: string;
  }>(`/recordings/${recordingId}/review`, {
    method: 'POST',
  }).then((result) => result.recording);
}

/**
 * Save a reviewed recording as a memory.
 * The backend uses its stored transcript and translation.
 */
export async function saveMemory(
  recordingId: string,
  title: string,
  visibility: 'PRIVATE' | 'FAMILY' = 'PRIVATE'
) {
  return request<{
    memory: {
      id: string;
      title: string;
    };
  }>(`/recordings/${recordingId}/save`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      visibility,
    }),
  });
}


export async function getRecordings() {
  return request<{
    recordings: Array<Recording & {
      session: {
        language: string;
        question?: StoryQuestion | null;
      };
      memory?: Memory | null;
    }>;
  }>('/recordings');
}

export async function downloadRecordingAudio(recordingId: string): Promise<string> {
  if (!authToken) {
    throw new Error('Authentication token is missing. Please restart the app session.');
  }

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('Device cache directory is unavailable.');
  }

  const localUri = `${cacheDirectory}recording-${recordingId}.m4a`;
  const cachedFile = await FileSystem.getInfoAsync(localUri);
  if (cachedFile.exists && cachedFile.size > 0) {
    return localUri;
  }

  if (cachedFile.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }

  const result = await FileSystem.downloadAsync(
    `${API_URL}/api/recordings/${recordingId}/audio`,
    localUri,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Audio download failed (HTTP ${result.status}).`);
  }

  const downloadedFile = await FileSystem.getInfoAsync(result.uri);
  if (!downloadedFile.exists || downloadedFile.size === 0) {
    throw new Error('The downloaded audio file is empty or missing.');
  }

  return result.uri;
}


/**
 * Retrieve saved memories.
 */
export async function getMemories() {
  return request<{
    memories: Memory[];
  }>('/memories');
}

export async function createStoryPrompt(
  sessionId: string,
  questionId: string
): Promise<{ storyPrompt: StoryPrompt }> {
  return request<{ storyPrompt: StoryPrompt }>(
    `/sessions/${sessionId}/prompts`,
    {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    }
  );
}



/**
 * Retrieve all story prompts in a session.
 */
export async function getStoryPrompts(sessionId: string) {
  return request<{
    prompts: StoryPromptDetails[];
  }>(`/sessions/${sessionId}/prompts`);
}

/**
 * Retrieve one story prompt, including its AI follow-up
 * and the processing status of its recordings.
 */
export async function getStoryPrompt(
  sessionId: string,
  promptId: string
) {
  return request<{
    storyPrompt: StoryPromptDetails;
  }>(`/sessions/${sessionId}/prompts/${promptId}`);
}

