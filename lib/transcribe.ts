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

export async function* streamTranscription(
  audioStream: AsyncIterable<Uint8Array>,
  languageCode: LanguageCode = LanguageCode.EN_US,
  vocabularyNames?: string[]
): AsyncGenerator<TranscriptionResult> {
  const client = getTranscribeClient()

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: languageCode,
    MediaSampleRateHertz: 16000,
    MediaEncoding: "pcm",
    VocabularyNames: vocabularyNames,
  })

  try {
    const response = await client.send(command)
    
    if (!response.TranscriptResultStream) {
      throw new Error("No transcript stream received")
    }

    // Send audio chunks
    const audioIterator = audioStream[Symbol.asyncIterator]()
    
    // Process transcription results
    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent) {
        const results = event.TranscriptEvent.Transcript?.Results || []
        
        for (const result of results) {
          if (result.Alternatives && result.Alternatives.length > 0) {
            const transcript = result.Alternatives[0].Transcript || ""
            const isPartial = result.IsPartial || false
            
            yield {
              transcript,
              isPartial,
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Transcription error:", error)
    throw error
  }
}

