/**
 * AI-powered transcript formatting service
 * Converts raw transcripts into polished, formatted text
 * Supports Grok API, OpenAI API, and local LLM (Ollama)
 */

export interface FormattingOptions {
  detectBulletPoints?: boolean      // Convert "point" → bullet
  refineGrammar?: boolean            // Improve grammar
  improvePunctuation?: boolean       // Fix punctuation
  improveCapitalization?: boolean   // Fix capitalization
  addFormatting?: boolean           // Add proper formatting
}

export interface FormatterConfig {
  provider?: 'groq' | 'openai' | 'local'
  apiKey?: string
  model?: string
}

/**
 * Format transcript using AI
 */
export async function aiFormatTranscript(
  transcript: string,
  options: FormattingOptions = {},
  config?: FormatterConfig
): Promise<string> {
  if (!transcript || transcript.trim().length === 0) {
    return transcript
  }

  // Default options - enable all formatting by default
  const formattingOptions: FormattingOptions = {
    detectBulletPoints: true,
    refineGrammar: true,
    improvePunctuation: true,
    improveCapitalization: true,
    addFormatting: true,
    ...options,
  }

  const provider = config?.provider || process.env.AI_FORMATTER_PROVIDER || 'groq'
  
  try {
    switch (provider) {
      case 'groq':
        return await formatWithGroq(transcript, formattingOptions, config)
      case 'openai':
        return await formatWithOpenAI(transcript, formattingOptions, config)
      case 'local':
        return await formatWithLocal(transcript, formattingOptions, config)
      default:
        console.warn(`Unknown AI formatter provider: ${provider}, returning original transcript`)
        return transcript // Fallback: return as-is
    }
  } catch (error) {
    console.error('AI formatting error:', error)
    // Always fallback to original transcript on error
    return transcript
  }
}

/**
 * Format using Groq API
 */
async function formatWithGroq(
  transcript: string,
  options: FormattingOptions,
  config?: FormatterConfig
): Promise<string> {
  // Use provided API key, or fallback to env Groq key (always available)
  const apiKey = config?.apiKey || process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn('Groq API key not found in config or env, skipping AI formatting')
    return transcript
  }

  const prompt = buildFormattingPrompt(transcript, options)
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure. Convert spoken formatting commands (like "point") into proper formatting (bullet points). Preserve the original meaning and content - only improve formatting, grammar, and structure. Do not add content that wasn\'t in the original.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for consistent formatting
        max_tokens: Math.min(Math.max(transcript.length * 2, 200), 2000), // Reasonable limit
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', response.status, errorText)
      return transcript // Fallback to original
    }

    const data = await response.json()
    const formatted = data.choices?.[0]?.message?.content?.trim()
    
    if (!formatted || formatted.length === 0) {
      console.warn('Groq returned empty response, using original transcript')
      return transcript
    }
    
    return formatted
  } catch (error) {
    console.error('Groq formatting error:', error)
    return transcript // Fallback to original
  }
}

/**
 * Format using OpenAI API
 */
async function formatWithOpenAI(
  transcript: string,
  options: FormattingOptions,
  config?: FormatterConfig
): Promise<string> {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OpenAI API key not found, skipping AI formatting')
    return transcript
  }

  const prompt = buildFormattingPrompt(transcript, options)
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure. Convert spoken formatting commands (like "point") into proper formatting (bullet points). Preserve the original meaning and content - only improve formatting, grammar, and structure. Do not add content that wasn\'t in the original.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: Math.min(Math.max(transcript.length * 2, 200), 2000),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      return transcript
    }

    const data = await response.json()
    const formatted = data.choices?.[0]?.message?.content?.trim()
    
    if (!formatted || formatted.length === 0) {
      console.warn('OpenAI returned empty response, using original transcript')
      return transcript
    }
    
    return formatted
  } catch (error) {
    console.error('OpenAI formatting error:', error)
    return transcript
  }
}

/**
 * Format using local LLM (Ollama)
 */
async function formatWithLocal(
  transcript: string,
  options: FormattingOptions,
  config?: FormatterConfig
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  const model = config?.model || 'llama3.1:8b'
  
  const prompt = buildFormattingPrompt(transcript, options)
  
  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure. Convert spoken formatting commands (like "point") into proper formatting (bullet points). Preserve the original meaning and content - only improve formatting, grammar, and structure.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.3,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ollama API error:', response.status, errorText)
      return transcript
    }

    const data = await response.json()
    const formatted = data.message?.content?.trim()
    
    if (!formatted || formatted.length === 0) {
      console.warn('Local LLM returned empty response, using original transcript')
      return transcript
    }
    
    return formatted
  } catch (error) {
    console.error('Local LLM formatting error:', error)
    return transcript
  }
}

/**
 * Build formatting prompt with specific instructions
 */
function buildFormattingPrompt(transcript: string, options: FormattingOptions): string {
  const instructions: string[] = []
  
  if (options.detectBulletPoints !== false) {
    instructions.push('- Convert the word "point" (when used to indicate a list item) into bullet points (•)')
    instructions.push('- Detect when user wants a list and format accordingly')
    instructions.push('- When user says "point one", "point two", etc., convert to bullet list format')
  }
  
  if (options.refineGrammar !== false) {
    instructions.push('- Fix grammar errors')
    instructions.push('- Improve sentence structure')
    instructions.push('- Ensure proper verb tenses')
  }
  
  if (options.improvePunctuation !== false) {
    instructions.push('- Add proper punctuation (commas, periods, question marks, exclamation marks)')
    instructions.push('- Fix punctuation errors')
    instructions.push('- Add commas in appropriate places')
  }
  
  if (options.improveCapitalization !== false) {
    instructions.push('- Fix capitalization (proper nouns, sentence starts)')
    instructions.push('- Ensure proper sentence capitalization')
    instructions.push('- Capitalize names and proper nouns correctly')
  }
  
  if (options.addFormatting !== false) {
    instructions.push('- Add proper paragraph breaks where appropriate')
    instructions.push('- Format lists properly with bullet points')
    instructions.push('- Ensure proper spacing between sentences')
  }
  
  return `Please format the following transcript. Apply these formatting rules:

${instructions.join('\n')}

**Important Guidelines:**
- Preserve the original meaning and content exactly
- Only improve formatting, grammar, and structure
- Do NOT add content that wasn't in the original transcript
- Do NOT remove content from the original transcript
- Convert formatting commands (like "point") into actual formatting
- Keep the same tone and style as the original

Transcript to format:
"${transcript}"

Formatted transcript (output only the formatted text, no explanations):`
}

/**
 * Check if AI formatting is available
 */
export function isAIFormattingAvailable(): boolean {
  const provider = process.env.AI_FORMATTER_PROVIDER || 'groq'
  
  switch (provider) {
    case 'groq':
      return !!process.env.GROQ_API_KEY
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    case 'local':
      return !!process.env.OLLAMA_URL
    default:
      return false
  }
}

