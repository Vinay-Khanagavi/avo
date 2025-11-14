# AI Post-Processing Implementation Plan

## 🎯 Goal
Add AI-powered post-processing to match Wispr Flow's capabilities:
- Convert "point" → bullet points (•)
- Refine grammar and punctuation
- Improve capitalization
- Context-aware formatting
- Automatic editing and refinement

---

## 📊 LLM Model Comparison

### Option 1: Grok API (xAI) ⭐ **RECOMMENDED**

**Pros:**
- ✅ **You already have API access** - No setup needed
- ✅ **Fast API** - Low latency for real-time processing
- ✅ **Good quality** - Comparable to GPT-4 for formatting tasks
- ✅ **No infrastructure** - Cloud-based, no local resources
- ✅ **Cost-effective** - Likely cheaper than GPT-4
- ✅ **Simple integration** - Just API calls

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ API rate limits (check your plan)

**Best For:** Production deployment, real-time processing

**Cost Estimate:** ~$0.01-0.05 per 1K tokens (check Grok pricing)

---

### Option 2: OpenAI GPT-4o-mini ⭐ **BEST QUALITY/COST**

**Pros:**
- ✅ **Excellent quality** - Great for formatting tasks
- ✅ **Fast** - Optimized for speed
- ✅ **Reliable** - Stable API
- ✅ **Cost-effective** - $0.15 per 1M input tokens, $0.60 per 1M output tokens
- ✅ **No infrastructure** - Cloud-based

**Cons:**
- ⚠️ Requires API key and billing setup
- ⚠️ Requires internet connection

**Best For:** High-quality formatting, production use

**Cost Estimate:** 
- ~$0.00015 per 1K input tokens
- ~$0.0006 per 1K output tokens
- **Example:** 100 words ≈ 130 tokens → ~$0.0001 per transcription

---

### Option 3: OpenAI GPT-4

**Pros:**
- ✅ **Best quality** - Highest accuracy
- ✅ **Excellent formatting** - Best understanding

**Cons:**
- ❌ **Expensive** - $30 per 1M input tokens, $60 per 1M output tokens
- ❌ **Slower** - Higher latency
- ❌ **Overkill** - Formatting doesn't need GPT-4's full capabilities

**Best For:** Not recommended for this use case (too expensive)

**Cost Estimate:** ~$0.03-0.06 per 1K tokens (10-20x more expensive than GPT-4o-mini)

---

### Option 4: Local LLM (Ollama/Llama/Mistral)

**Pros:**
- ✅ **Free** - No API costs
- ✅ **Privacy** - Data stays local
- ✅ **No rate limits** - Unlimited usage
- ✅ **Offline** - Works without internet

**Cons:**
- ❌ **Hardware required** - Needs GPU (16GB+ VRAM) or powerful CPU
- ❌ **Setup complexity** - Requires model download and setup
- ❌ **Slower** - Local inference is slower than API
- ❌ **Resource intensive** - Uses significant RAM/GPU
- ❌ **Maintenance** - Need to manage model updates

**Best For:** Privacy-sensitive use cases, high-volume usage, offline requirements

**Models to Consider:**
- **Llama 3.1 8B** - Good balance (8GB VRAM)
- **Mistral 7B** - Fast and efficient (7GB VRAM)
- **Llama 3.1 70B** - Best quality (40GB+ VRAM)

---

## 🏆 **RECOMMENDATION: Grok API**

**Why Grok API is Best:**
1. ✅ **You already have access** - No setup friction
2. ✅ **Fast and reliable** - Good for real-time processing
3. ✅ **Good quality** - Sufficient for formatting tasks
4. ✅ **Simple integration** - Just API calls
5. ✅ **Cost-effective** - Likely cheaper than GPT-4

**Fallback:** GPT-4o-mini if Grok doesn't meet quality requirements

---

## 📋 Implementation Plan

### Phase 1: Setup AI Formatter Service (Day 1)

#### Step 1.1: Create AI Formatter Service

**File:** `lib/ai-formatter.ts` (NEW)

```typescript
/**
 * AI-powered transcript formatting service
 * Converts raw transcripts into polished, formatted text
 */

export interface FormattingOptions {
  detectBulletPoints?: boolean      // Convert "point" → bullet
  refineGrammar?: boolean            // Improve grammar
  improvePunctuation?: boolean       // Fix punctuation
  improveCapitalization?: boolean   // Fix capitalization
  addFormatting?: boolean           // Add proper formatting
}

export interface FormatterConfig {
  provider: 'grok' | 'openai' | 'local'
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

  const provider = config?.provider || process.env.AI_FORMATTER_PROVIDER || 'grok'
  
  switch (provider) {
    case 'grok':
      return formatWithGrok(transcript, options, config)
    case 'openai':
      return formatWithOpenAI(transcript, options, config)
    case 'local':
      return formatWithLocal(transcript, options, config)
    default:
      return transcript // Fallback: return as-is
  }
}

/**
 * Format using Grok API
 */
async function formatWithGrok(
  transcript: string,
  options: FormattingOptions,
  config?: FormatterConfig
): Promise<string> {
  const apiKey = config?.apiKey || process.env.GROK_API_KEY
  if (!apiKey) {
    console.warn('Grok API key not found, skipping AI formatting')
    return transcript
  }

  const prompt = buildFormattingPrompt(transcript, options)
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure. Convert spoken formatting commands (like "point") into proper formatting (bullet points).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for consistent formatting
        max_tokens: Math.min(transcript.length * 2, 2000), // Reasonable limit
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Grok API error:', error)
      return transcript // Fallback to original
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || transcript
  } catch (error) {
    console.error('Grok formatting error:', error)
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
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure. Convert spoken formatting commands (like "point") into proper formatting (bullet points).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: Math.min(transcript.length * 2, 2000),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return transcript
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || transcript
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
            content: 'You are a professional text formatter. Format transcripts with proper grammar, punctuation, capitalization, and structure.'
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
      console.error('Ollama API error:', await response.text())
      return transcript
    }

    const data = await response.json()
    return data.message?.content || transcript
  } catch (error) {
    console.error('Local LLM formatting error:', error)
    return transcript
  }
}

/**
 * Build formatting prompt
 */
function buildFormattingPrompt(transcript: string, options: FormattingOptions): string {
  const instructions: string[] = []
  
  if (options.detectBulletPoints !== false) {
    instructions.push('- Convert word "point" (when used to indicate a list item) into bullet points (•)')
    instructions.push('- Detect when user wants a list and format accordingly')
  }
  
  if (options.refineGrammar !== false) {
    instructions.push('- Fix grammar errors')
    instructions.push('- Improve sentence structure')
  }
  
  if (options.improvePunctuation !== false) {
    instructions.push('- Add proper punctuation (commas, periods, etc.)')
    instructions.push('- Fix punctuation errors')
  }
  
  if (options.improveCapitalization !== false) {
    instructions.push('- Fix capitalization (proper nouns, sentence starts)')
    instructions.push('- Ensure proper sentence capitalization')
  }
  
  if (options.addFormatting !== false) {
    instructions.push('- Add proper paragraph breaks where appropriate')
    instructions.push('- Format lists properly')
  }
  
  return `Please format the following transcript. Apply these formatting rules:

${instructions.join('\n')}

**Important:** 
- Preserve original meaning and content
- Only improve formatting, grammar, and structure
- Do not add content that wasn't in original
- Convert formatting commands (like "point") into actual formatting

Transcript to format:
${transcript}

Formatted transcript:`
}
```

#### Step 1.2: Update Transcription Pipeline

**File:** `app/api/transcribe/stream/route.ts`

Add AI formatting after transcription:

```typescript
import { aiFormatTranscript } from '@/lib/ai-formatter'

// After getting transcript from service (around line 75)
const rawTranscript = result.transcript

// Apply AI formatting
let formattedTranscript = rawTranscript
try {
  formattedTranscript = await aiFormatTranscript(rawTranscript, {
    detectBulletPoints: true,
    refineGrammar: true,
    improvePunctuation: true,
    improveCapitalization: true,
    addFormatting: true,
  }, {
    provider: process.env.AI_FORMATTER_PROVIDER as 'grok' | 'openai' | 'local' || 'grok',
    apiKey: process.env.GROK_API_KEY || process.env.OPENAI_API_KEY,
  })
} catch (error) {
  console.error('AI formatting failed, using raw transcript:', error)
  // Continue with raw transcript if formatting fails
}

// Then apply dictionary replacements
const finalTranscript = applyDictionaryReplacements(
  formattedTranscript,
  dictionary
)

// Update result with formatted transcript
result.transcript = finalTranscript
result.incremental = finalTranscript.slice(existingTranscript.length)
```

#### Step 1.3: Add Environment Variables

**File:** `.env.local` (or Railway Variables)

```env
# AI Formatter Configuration
AI_FORMATTER_PROVIDER=grok  # Options: grok, openai, local
GROK_API_KEY=your-grok-api-key-here
OPENAI_API_KEY=your-openai-api-key-here  # Fallback option

# Optional: Local LLM (Ollama)
OLLAMA_URL=http://localhost:11434
```

---

### Phase 2: Testing & Optimization (Day 2)

#### Step 2.1: Test Formatting

Create test cases:
- "point" → bullet conversion
- Grammar refinement
- Punctuation improvement
- Capitalization fixes

#### Step 2.2: Optimize Prompts

Fine-tune prompts based on results:
- Adjust temperature
- Refine instructions
- Test different models

#### Step 2.3: Add Caching (Optional)

Cache formatted results to reduce API calls:
```typescript
// Simple in-memory cache
const formatCache = new Map<string, string>()
```

---

### Phase 3: Error Handling & Fallbacks (Day 2-3)

#### Step 3.1: Graceful Degradation

- If AI formatting fails → use raw transcript
- If API is down → skip formatting
- Log errors for monitoring

#### Step 3.2: Rate Limiting

- Implement rate limiting for API calls
- Queue requests if needed
- Add retry logic

---

## 🚀 Quick Start Guide

### 1. Set Up Grok API (Recommended)

```bash
# Add to Railway Variables or .env.local
AI_FORMATTER_PROVIDER=grok
GROK_API_KEY=your-grok-api-key
```

### 2. Install Dependencies (if needed)

No new dependencies required - using native `fetch` API.

### 3. Deploy

The code will automatically use Grok API when `GROK_API_KEY` is set.

### 4. Test

Try saying: "Here are three points. Point one, this is important. Point two, this is also important. Point three, this is the last point."

Expected output:
```
Here are three points:
• This is important
• This is also important
• This is the last point
```

---

## 📊 Cost Analysis

### Grok API (Recommended)
- **Estimated cost:** ~$0.01-0.05 per 1K tokens
- **Per transcription:** ~$0.0001-0.0005 (100 words ≈ 130 tokens)
- **Monthly (1000 transcriptions):** ~$0.10-0.50

### GPT-4o-mini (Fallback)
- **Cost:** $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **Per transcription:** ~$0.0001 (100 words)
- **Monthly (1000 transcriptions):** ~$0.10

### Local LLM
- **Cost:** $0 (but requires hardware)
- **Hardware cost:** GPU with 8GB+ VRAM (~$500-1000)

---

## ✅ Success Criteria

After implementation, you should be able to:

1. ✅ Say "point" and get bullet points (•)
2. ✅ Get properly formatted text with correct punctuation
3. ✅ Get improved grammar and capitalization
4. ✅ Get context-aware formatting (lists, paragraphs)
5. ✅ Match Wispr Flow's formatting quality

---

## 🔄 Future Enhancements

1. **User Preferences:** Allow users to customize formatting style
2. **Learning:** Learn from user corrections
3. **Batch Processing:** Format multiple transcripts at once
4. **Custom Commands:** Add more formatting commands ("new paragraph", "bold", etc.)
5. **Multi-language:** Support formatting for multiple languages

---

## 📝 Notes

- **Privacy:** Grok/OpenAI API sends data to their servers. For privacy-sensitive use cases, consider local LLM.
- **Latency:** AI formatting adds ~200-500ms latency. Consider async processing for better UX.
- **Fallback:** Always fallback to raw transcript if formatting fails - never break the transcription flow.