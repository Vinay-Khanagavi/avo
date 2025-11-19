import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY,
})

export async function POST(req: Request) {
    try {
        const { text, dictionary } = await req.json()

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Text is required" }, { status: 400 })
        }

        // Construct dictionary context
        let dictionaryContext = ""
        if (dictionary && Array.isArray(dictionary) && dictionary.length > 0) {
            const terms = dictionary.map((d: any) => d.word).join(", ")
            dictionaryContext = `\n\nIMPORTANT: The following terms must be spelled EXACTLY as shown if they appear in the text: ${terms}`
        }

        const systemPrompt = `You are an expert editor and proofreader. Your task is to refine the following transcribed text.
    
Rules:
1. Fix spelling, grammar, and punctuation errors.
2. Remove filler words (um, uh, like, you know) unless they are essential to the meaning.
3. Improve sentence structure for clarity, but KEEP the original meaning and tone.
4. Do NOT summarize or rewrite the content completely. Just polish it.
5. Output ONLY the refined text. Do not add any conversational filler like "Here is the refined text:".${dictionaryContext}`

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
            model: "llama3-70b-8192",
            temperature: 0.3,
            max_tokens: 4096,
        })

        const refinedText = completion.choices[0]?.message?.content || text

        return NextResponse.json({ refinedText })
    } catch (error: any) {
        console.error("Refinement error:", error)
        return NextResponse.json(
            { error: "Failed to refine text", details: error.message },
            { status: 500 }
        )
    }
}
