export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
}

export async function convertToPCM(audioBlob: Blob): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    throw new Error("convertToPCM can only be called client-side")
  }

  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  })

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const pcmData = convertAudioBufferToPCM(audioBuffer)
    return pcmData
  } catch (error) {
    console.error("Error converting audio to PCM:", error)
    throw error
  }
}

function convertAudioBufferToPCM(audioBuffer: AudioBuffer): Uint8Array {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const pcmData = new Int16Array(length)

  // Mix down to mono if stereo
  if (numChannels === 1) {
    const channelData = audioBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF
    }
  } else {
    // Mix stereo to mono
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.getChannelData(1)
    for (let i = 0; i < length; i++) {
      const sample = (leftChannel[i] + rightChannel[i]) / 2
      pcmData[i] = Math.max(-1, Math.min(1, sample)) * 0x7FFF
    }
  }

  // Convert Int16Array to Uint8Array (little-endian)
  const uint8Array = new Uint8Array(pcmData.buffer)
  return uint8Array
}

/**
 * Create MediaRecorder with optimal settings for transcription
 */
export function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const options: MediaRecorderOptions = {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 16000,
  }

  if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
    // Fallback to default
    return new MediaRecorder(stream)
  }

  return new MediaRecorder(stream, options)
}

/**
 * Slice audio into 5-second chunks and stream them to server
 * Server will handle accumulation and creating valid media files
 */
export function createAudioSlicer(
  mediaRecorder: MediaRecorder,
  onChunk: (chunk: Blob) => void
): () => void {
  const CHUNK_DURATION_MS = 5000 // 5-second chunks for cost efficiency at scale

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      console.log(`[AudioProcessor] Chunk: ${event.data.size} bytes`)
      onChunk(event.data)
    }
  }

  mediaRecorder.start(CHUNK_DURATION_MS)

  return () => {
    mediaRecorder.stop()
  }
}
