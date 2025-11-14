import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from "@aws-sdk/client-transcribe-streaming"
import { fromIni } from "@aws-sdk/credential-providers"

// Initialize AWS Transcribe client
// Uses AWS CLI credentials from ~/.aws/credentials
export function getTranscribeClient() {
  const region = process.env.AWS_REGION || "us-east-1"
  
  return new TranscribeStreamingClient({
    region,
    credentials: fromIni({
      profile: process.env.AWS_PROFILE || "default",
    }),
  })
}

export interface TranscriptionResult {
  transcript: string
  isPartial: boolean
}

/**
 * @deprecated This function is deprecated. Use Whisper streaming transcription instead.
 * See lib/whisper-stream.ts for the new implementation.
 */
export async function* streamTranscription(
  audioStream: AsyncIterable<Uint8Array>,
  languageCode: LanguageCode = LanguageCode.EN_US,
  vocabularyNames?: string[]
): AsyncGenerator<TranscriptionResult> {
  // DEPRECATED: This AWS Transcribe code is no longer used
  // Using Whisper streaming instead - see lib/whisper-stream.ts
  throw new Error("AWS Transcribe streaming is deprecated. Use Whisper streaming instead.")
  
}

