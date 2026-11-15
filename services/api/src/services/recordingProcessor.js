
import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../config/prisma.js';
import {
    transcribeAudio,
    translateToEnglish,
    createFollowUp
} from './ai.js';

async function generatePromptFollowUp(storyPromptId) {
    try {
        // Read the prompt and its processed answers.
        const storyPrompt = await prisma.storyPrompt.findUnique({
            where: { id: storyPromptId },
            include: {
                question: true,
                recordings: true
            }
        });

        if (!storyPrompt || storyPrompt.aiFollowUpText) {
            return;
        }

        const mainRecording = storyPrompt.recordings.find(
            (recording) => recording.answerType === 'MAIN'
        );

        const permanentRecording = storyPrompt.recordings.find(
            (recording) =>
                recording.answerType === 'PERMANENT_FOLLOW_UP'
        );

        // Both answers must be fully processed before generating the question.
        if (
            !mainRecording ||
            !permanentRecording ||
            mainRecording.status !== 'SAVED' ||
            permanentRecording.status !== 'SAVED' ||
            !mainRecording.englishTranslation ||
            !permanentRecording.englishTranslation
        ) {
            return;
        }

        // Atomically claim generation so concurrent processors cannot
        // generate multiple AI questions for the same prompt.
        const claim = await prisma.storyPrompt.updateMany({
            where: {
                id: storyPromptId,
                aiFollowUpText: null,
                aiFollowUpStatus: 'PENDING'
            },
            data: {
                aiFollowUpStatus: 'GENERATING'
            }
        });

        if (claim.count === 0) {
            return;
        }

        try {
            const combinedAnswer =
                `Main answer:\n${mainRecording.englishTranslation}\n\n` +
                `Permanent follow-up answer:\n${permanentRecording.englishTranslation}`;

            const aiQuestion = await createFollowUp({
                question: storyPrompt.question.text,
                answer: combinedAnswer,
                language: storyPrompt.question.language
            });

            if (!aiQuestion) {
                throw new Error('AI returned an empty follow-up question.');
            }

            await prisma.storyPrompt.update({
                where: { id: storyPromptId },
                data: {
                    aiFollowUpText: aiQuestion,
                    aiFollowUpStatus: 'READY'
                }
            });

            console.log(
                `AI follow-up generated for StoryPrompt ${storyPromptId}.`
            );
        } catch (error) {
            await prisma.storyPrompt.update({
                where: { id: storyPromptId },
                data: {
                    aiFollowUpStatus: 'FAILED'
                }
            });

            throw error;
        }
    } catch (error) {
        console.error(
            `AI follow-up generation failed for ${storyPromptId}:`,
            error instanceof Error ? error.message : error
        );
    }
}

export async function processRecording(recordingId) {
    try {
        const recording = await prisma.recording.findUnique({
            where: { id: recordingId },
            include: {
                session: true,
                storyPrompt: {
                    include: {
                        question: true
                    }
                }
            }
        });

        if (!recording) {
            throw new Error('Recording not found.');
        }

        if (!recording.originalAudioKey) {
            throw new Error('The recording has no audio storage key.');
        }

        if (process.env.STORAGE_DRIVER === 's3') {
            throw new Error(
                'S3 processing is not configured. Use local storage until S3 download support is implemented.'
            );
        }

        const uploadDir = path.resolve(
            process.env.UPLOAD_DIR || './uploads'
        );

        const audioPath = path.resolve(
            uploadDir,
            recording.originalAudioKey
        );

        if (
            audioPath === uploadDir ||
            !audioPath.startsWith(uploadDir + path.sep)
        ) {
            throw new Error('Invalid recording storage path.');
        }

        await fs.access(audioPath);

        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                status: 'TRANSCRIBING',
                processingError: null,
                originalTranscript: null,
                detectedLanguage: null
            }
        });

        // Detect and transcribe the language actually spoken.
        const originalTranscript = await transcribeAudio(audioPath);

        if (!originalTranscript?.trim()) {
            throw new Error('No speech was detected in this recording.');
        }

        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                status: 'TRANSLATING'
            }
        });

        // All saved memory text is English.
        const englishTranslation = await translateToEnglish(
            originalTranscript
        );

        if (!englishTranslation?.trim()) {
            throw new Error('English translation was empty.');
        }

        const englishText = englishTranslation.trim();

        // Create the memory automatically after successful processing.
        await prisma.memory.upsert({
            where: {
                recordingId: recording.id
            },
            update: {
                transcript: englishText,
                translation: englishText
            },
            create: {
                userId: recording.session.userId,
                recordingId: recording.id,
                title:
                    englishText.length > 80
                        ? `${englishText.slice(0, 77)}...`
                        : englishText,
                transcript: englishText,
                translation: englishText,
                visibility: 'PRIVATE'
            }
        });

        // Do not persist the source-language transcript.
        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                originalTranscript: null,
                englishTranslation: englishText,
                detectedLanguage: null,
                status: 'SAVED',
                processingError: null
            }
        });

        console.log(`Recording ${recordingId} processed successfully.`);

        // Once MAIN and PERMANENT_FOLLOW_UP are both saved,
        // generate exactly one AI follow-up question.
        if (recording.storyPromptId) {
            await generatePromptFollowUp(recording.storyPromptId);
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Recording processing failed.';

        console.error(
            `Recording ${recordingId} processing failed:`,
            message
        );

        await prisma.recording.update({
            where: { id: recordingId },
            data: {
                status: 'FAILED',
                processingError: message
            }
        }).catch((dbError) => {
            console.error(
                'Could not update failed recording:',
                dbError
            );
        });
    }
}
