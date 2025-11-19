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


export function createAudioSlicer(
  mediaRecorder: MediaRecorder,
  onChunk: (chunk: Blob) => void
): () => void {
  const CHUNK_DURATION_MS = 5000 // 5 seconds per slice
  const firstChunkRef: Blob[] = [] // Store first chunk (has headers)
  const accumulatedChunks: Blob[] = []
  let chunkCount = 0

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunkCount++

      if (chunkCount === 1) {
        // First chunk has WebM headers - send immediately for real-time processing
        firstChunkRef.push(event.data)
        accumulatedChunks.push(event.data)

        // Send first chunk immediately if it has sufficient audio data (not just headers)
        // WebM headers are typically ~100-500 bytes, so 4KB ensures we have real audio
        if (event.data.size > 4096) {
          console.log(`[AudioProcessor] First chunk ready: ${event.data.size} bytes`)
          onChunk(event.data)
        } else {
          console.log(`[AudioProcessor] First chunk too small (${event.data.size} bytes), waiting for more data`)
        }
      } else {
        // Subsequent chunks are fragments - combine with first chunk to create complete WebM
        accumulatedChunks.push(event.data)

        // Create complete segment by combining first chunk (with headers) + fragments
        // This creates a valid WebM file that ffmpeg can process
        const completeSegment = new Blob(accumulatedChunks, { type: 'audio/webm;codecs=opus' })

        // Send immediately for streaming transcription with proper size threshold
        // Ensure we have enough audio data to transcribe (not just headers)
        if (completeSegment.size > 4096) {
          console.log(`[AudioProcessor] Sending chunk ${chunkCount}: ${completeSegment.size} bytes (${accumulatedChunks.length} fragments)`)
          onChunk(completeSegment)
        } else {
          console.log(`[AudioProcessor] Chunk ${chunkCount} too small (${completeSegment.size} bytes), accumulating more data`)
        }

        // Keep only the last fragment for next iteration (for continuity)
        // This maintains the buffer overlap on client side too
        if (accumulatedChunks.length > 1) {
          // Keep first chunk (headers) + last fragment
          const lastFragment = accumulatedChunks[accumulatedChunks.length - 1]
          accumulatedChunks.length = 0
          accumulatedChunks.push(firstChunkRef[0])
          accumulatedChunks.push(lastFragment)
        }
      }
    }
  }

  // Start recording with timeslice for automatic 5-second chunking
  mediaRecorder.start(CHUNK_DURATION_MS)

  return () => {
    mediaRecorder.stop()

    // Send any remaining accumulated chunks when stopping
    // This ensures the final slice is processed
    if (accumulatedChunks.length > 0) {
      const finalSegment = new Blob(accumulatedChunks, { type: 'audio/webm;codecs=opus' })
      if (finalSegment.size > 0) {
        onChunk(finalSegment)
      }
    }
  }
}

