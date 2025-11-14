/**
 * Audio sound effects for recording
 * 
 * Audio files are located in /public/audio/:
 * - start-recording.wav - Sound when recording starts
 * - disconnect.wav - Sound when recording ends/disconnects
 */

const RECORDING_START_SOUND = "/audio/start-recording.wav"
const RECORDING_END_SOUND = "/audio/disconnect.wav"

/**
 * Play a sound effect
 */
function playSound(soundPath: string, volume: number = 0.5) {
  try {
    const audio = new Audio(soundPath)
    audio.volume = volume
    audio.play().catch((error) => {
      console.warn("Failed to play sound:", error)
    })
  } catch (error) {
    console.warn("Error creating audio:", error)
  }
}

/**
 * Play sound when recording starts
 */
export function playRecordingStartSound(volume: number = 0.5) {
  playSound(RECORDING_START_SOUND, volume)
}

/**
 * Play sound when recording ends
 */
export function playRecordingEndSound(volume: number = 0.5) {
  playSound(RECORDING_END_SOUND, volume)
}

