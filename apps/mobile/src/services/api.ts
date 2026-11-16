
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = 'http://192.168.1.10:4000';
const AUTH_TOKEN_KEY = 'our_stories_auth_token';

const REQUEST_TIMEOUT_MS = 30000;

let authToken: string | null = null;

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'PURCHASER' | 'RECIPIENT' | 'ADMIN';
  preferredLanguage: string;
};

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

// --------------------------------------------------
// AUTH TOKEN MANAGEMENT
// --------------------------------------------------

export async function saveAuthToken(token: string): Promise<void> {
  if (!token) {
    throw new Error('Authentication token is missing.');
  }

  authToken = token;
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function restoreAuthSession(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

    authToken = token || null;

    return Boolean(token);
  } catch (error) {
    console.error('Could not restore authentication:', error);
    authToken = null;
    return false;
  }
}

export async function clearAuthSession(): Promise<void> {
  authToken = null;
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

// --------------------------------------------------
// COMMON API REQUEST
// --------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!authToken) {
    await restoreAuthSession();
  }

  const headers = new Headers(options.headers || {});

  const hasBody =
    options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `Request failed (${response.status})`
      );
    }

    return data as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        'The server took too long to respond. Check that your backend is running.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

export async function signup(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  language: 'en' | 'hi' | 'gu';
}) {
  return request<{
    message: string;
    emailVerificationRequired: true;
    email: string;
  }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(data: {
  email: string;
  code: string;
}): Promise<AuthUser> {
  const result = await request<{
    token: string;
    user: AuthUser;
  }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  await saveAuthToken(result.token);

  return result.user;
}

export async function resendVerification(email: string) {
  return request<{ message: string }>(
    '/auth/resend-verification',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  );
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const result = await request<{
    token: string;
    user: AuthUser;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  await saveAuthToken(result.token);

  return result.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await request<{ user: AuthUser }>('/auth/me');

  return result.user;
}

// --------------------------------------------------
// SESSION INITIALIZATION
// --------------------------------------------------

/**
 * Compatibility function for the existing Dashboard.
 * It no longer creates a demo user or replaces the real
 * purchaser's authentication token.
 */
export async function startDemoSession(
  _language: 'en' | 'hi' | 'gu'
) {
  const hasToken = await restoreAuthSession();

  if (!hasToken) {
    throw new Error('Please log in to continue.');
  }

  return getCurrentUser();
}

// --------------------------------------------------
// QUESTIONS
// --------------------------------------------------

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

// --------------------------------------------------
// STORY SESSIONS
// --------------------------------------------------

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

// --------------------------------------------------
// STORY PROMPTS
// --------------------------------------------------

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

export async function getStoryPrompts(sessionId: string) {
  return request<{
    prompts: StoryPromptDetails[];
  }>(`/sessions/${sessionId}/prompts`);
}

export async function getStoryPrompt(
  sessionId: string,
  promptId: string
) {
  return request<{
    storyPrompt: StoryPromptDetails;
  }>(`/sessions/${sessionId}/prompts/${promptId}`);
}

// --------------------------------------------------
// RECORDING UPLOAD
// --------------------------------------------------

export async function uploadRecording(
  sessionId: string,
  uri: string,
  filename: string,
  storyPromptId: string,
  answerType: AnswerType
): Promise<Recording> {
  if (!uri) {
    throw new Error('No audio recording was found.');
  }

  if (!storyPromptId) {
    throw new Error('Story prompt ID is missing.');
  }

  if (!authToken) {
    await restoreAuthSession();
  }

  if (!authToken) {
    throw new Error('Authentication token is missing. Please log in again.');
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
    throw new Error('The server did not return the saved recording.');
  }

  return data.recording;
}

// --------------------------------------------------
// RECORDING REVIEW
// --------------------------------------------------

export async function reviewRecording(
  recordingId: string
): Promise<Recording> {
  const result = await request<{
    recording: Recording;
    message?: string;
  }>(`/recordings/${recordingId}/review`, {
    method: 'POST',
  });

  return result.recording;
}

// --------------------------------------------------
// SAVE MEMORY
// --------------------------------------------------

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

// --------------------------------------------------
// GET RECORDINGS
// --------------------------------------------------

export async function getRecordings() {
  return request<{
    recordings: Array<
      Recording & {
        session: {
          language: string;
          question?: StoryQuestion | null;
        };
        memory?: Memory | null;
      }
    >;
  }>('/recordings');
}

// --------------------------------------------------
// DOWNLOAD RECORDING AUDIO
// --------------------------------------------------

export async function downloadRecordingAudio(
  recordingId: string
): Promise<string> {
  if (!authToken) {
    await restoreAuthSession();
  }

  if (!authToken) {
    throw new Error('Authentication token is missing.');
  }

  const cacheDirectory = FileSystem.cacheDirectory;

  if (!cacheDirectory) {
    throw new Error('Device cache directory is unavailable.');
  }

  const localUri =
    `${cacheDirectory}recording-${recordingId}.m4a`;

  const cachedFile = await FileSystem.getInfoAsync(localUri);

  if (cachedFile.exists && cachedFile.size > 0) {
    return localUri;
  }

  if (cachedFile.exists) {
    await FileSystem.deleteAsync(localUri, {
      idempotent: true,
    });
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
    throw new Error(
      `Audio download failed (HTTP ${result.status}).`
    );
  }

  const downloadedFile = await FileSystem.getInfoAsync(result.uri);

  if (!downloadedFile.exists || downloadedFile.size === 0) {
    throw new Error('The downloaded audio file is empty or missing.');
  }

  return result.uri;
}

// --------------------------------------------------
// GET MEMORIES
// --------------------------------------------------

export async function getMemories() {
  return request<{
    memories: Memory[];
  }>('/memories');
}
