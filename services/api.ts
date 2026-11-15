
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

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
  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`
    );
  }

  return data as T;
}

export type StoryQuestion = {
  id: string;
  text: string;
  language: string;
  categoryId: string;
  category?: { id: string };
};

export type Recording = {
  id: string;
  originalAudioUrl: string;
  originalAudioKey: string;
  mimeType: string;
  durationSeconds: number | null;
  status: string;
  originalTranscript: string | null;
  englishTranslation: string | null;
  detectedLanguage: string | null;
  processingError: string | null;
  createdAt: string;
  session: {
    language: string;
    question?: StoryQuestion | null;
  };
  memory?: Memory | null;
};

export type Memory = {
  id: string;
  title: string;
  transcript: string;
  translation: string;
  visibility: string;
  createdAt: string;
};

export async function startDemoSession(
  language: 'en' | 'hi' | 'gu'
) {
  const result = await request<{
    token: string;
    user: { id: string };
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

  return request<{ questions: StoryQuestion[] }>(
    `/questions?${query.toString()}`
  );
}

export async function createStorySession(
  questionId: string | undefined,
  language: 'en' | 'hi' | 'gu'
) {
  return request<{ session: { id: string } }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ questionId, language }),
  });
}

// Upload only. No transcription or translation happens here.


export async function uploadRecording(
  sessionId: string,
  uri: string,
  filename: string,
  storyPromptId: string,
  answerType: AnswerType
) {
  if (!authToken) {
    throw new Error('You are not authenticated.');
  }

  if (!sessionId || !storyPromptId || !answerType || !uri) {
    throw new Error('Missing session, prompt, answer type or audio file.');
  }

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
      },
    }
  );

  const data = JSON.parse(result.body || '{}');

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      data.error ||
      data.message ||
      `Audio upload failed (HTTP ${result.status}).`
    );
  }

  return data.recording as Recording;
}



// Fetch all uploaded recordings, including unreviewed ones.
export async function getRecordings() {
  return request<{ recordings: Recording[] }>('/recordings');
}

// OpenAI processing happens only when the user presses Review.
export async function reviewRecording(recordingId: string) {
  return request<{
    message: string;
    recording: Recording;
  }>(`/recordings/${recordingId}/review`, {
    method: 'POST',
  });
}

// Download original audio through the authenticated playback endpoint.


export async function downloadRecordingAudio(recordingId: string) {
  if (!authToken) {
    throw new Error('Authentication token is missing. Please restart the app session.');
  }

  const cacheDirectory = FileSystem.cacheDirectory;

  if (!cacheDirectory) {
    throw new Error('Device cache directory is unavailable.');
  }

  const localUri = `${cacheDirectory}recording-${recordingId}.m4a`;

  try {
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

    const fileInfo = await FileSystem.getInfoAsync(result.uri);

    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('The downloaded audio file is empty or missing.');
    }

    return result.uri;
  } catch (error) {
    console.error('Recording download error:', error);
    throw error;
  }
}




// Save transcript and translation already reviewed on the server.
export async function saveMemory(
  recordingId: string,
  title: string,
  visibility: 'PRIVATE' | 'FAMILY' = 'PRIVATE'
) {
  return request<{ memory: Memory }>(
    `/recordings/${recordingId}/save`,
    {
      method: 'POST',
      body: JSON.stringify({
        title,
        visibility,
      }),
    }
  );
}

export async function getMemories() {
  return request<{ memories: Memory[] }>('/memories');
}

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
  question: StoryQuestion;
  recordings: Recording[];
};

export async function createStoryPrompt(
  sessionId: string,
  questionId: string,
  sortOrder = 0
) {
  return request<{ storyPrompt: StoryPrompt }>(
    `/sessions/${sessionId}/prompts`,
    {
      method: 'POST',
      body: JSON.stringify({ questionId, sortOrder }),
    }
  );
}

export async function getStoryPrompt(
  sessionId: string,
  promptId: string
) {
  return request<{ storyPrompt: StoryPrompt }>(
    `/sessions/${sessionId}/prompts/${promptId}`
  );
}

export async function getSessionPrompts(sessionId: string) {
  return request<{ prompts: StoryPrompt[] }>(
    `/sessions/${sessionId}/prompts`
  );
}
