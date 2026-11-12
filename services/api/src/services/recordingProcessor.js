
import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../config/prisma.js';
import {
    transcribeAudio,
    translateToEnglish,
} from './ai.js';

export async function processRecording(recordingId) {
    try {
        const recording = await prisma.recording.findUnique({
            where: { id: recordingId },
            include: { session: true },
        });

        if (!recording) {
            throw new Error('Recording not found.');
        }

        if (!recording.originalAudioKey) {
            throw new Error('The recording has no audio storage key.');
        }

        // This processor currently uses local audio storage.
        if (process.env.STORAGE_DRIVER === 's3') {
            throw new Error('This processor is configured for local storage only.');
        }

        const uploadDir = path.resolve(
            process.env.UPLOAD_DIR || './uploads'
        );

        const audioPath = path.resolve(
            uploadDir,
            recording.originalAudioKey
        );

        // Prevent a storage key from escaping the upload directory.
        if (
            audioPath === uploadDir ||
            !audioPath.startsWith(uploadDir + path.sep)
        ) {
            throw new Error('Invalid recording storage path.');
        }

        await fs.access(audioPath);

        const language = recording.session.language;

        // 1. Transcribe using the selected recording language.
        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                status: 'TRANSCRIBING',
                processingError: null,
            },
        });

        const transcript = await transcribeAudio(audioPath, language);

        if (!transcript) {
            throw new Error('No speech was detected in this recording.');
        }

        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                originalTranscript: transcript,
                detectedLanguage: language,
                status: 'TRANSLATING',
            },
        });

        // 2. Translate into English.
        const englishTranslation =
            language === 'en'
                ? transcript
                : await translateToEnglish(transcript, language);

        if (!englishTranslation?.trim()) {
            throw new Error('English translation was empty.');
        }

        // 3. Save the completed result directly on the recording.
        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                englishTranslation: englishTranslation.trim(),
                status: 'SAVED',
                processingError: null,
            },
        });

        console.log(`Recording ${recordingId} processed successfully.`);
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Recording processing failed.';

        console.error(`Recording ${recordingId} processing failed:`, message);

        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                status: 'FAILED',
                processingError: message,
            },
        }).catch((dbError) => {
            console.error('Could not update failed recording:', dbError);
        });
    }
}
