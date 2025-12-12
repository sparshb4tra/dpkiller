import { ChatMessage, MessageRole } from "../types";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Using Llama 3.3 70B for high quality and speed
const MODEL_NAME = "llama-3.3-70b-versatile"; 

export const streamAIResponse = async (
  history: ChatMessage[],
  currentContext: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    if (!API_KEY) {
      throw new Error("Missing VITE_GROQ_API_KEY");
    }

    const systemInstruction = `You are an AI assistant embedded in a text editor named PadAI. 
    Your goal is to help the user write, edit, and understand their notes.
    Be concise, direct, and helpful. Use plain text or simple markdown.`;

    // Prepare messages for OpenAI-compatible API
    const messages = [
      { role: "system", content: systemInstruction },
      ...history
        .filter(m => !m.isStreaming)
        .slice(-10) // Keep last 10 messages for context
        .map(m => ({
          role: m.role === MessageRole.USER ? "user" : "assistant",
          content: m.text
        })),
      {
        role: "user",
        content: `[CURRENT DOCUMENT CONTENT START]\n${currentContext}\n[CURRENT DOCUMENT CONTENT END]\n\nUser Query: ${userPrompt}`
      }
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("401 Unauthorized - Invalid API Key");
      if (response.status === 429) throw new Error("429 Too Many Requests - Quota Exceeded");
      throw new Error(`Groq API Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") return fullText;
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              onChunk(fullText);
            }
          } catch (e) {
            console.warn("Error parsing Groq chunk", e);
          }
        }
      }
    }

    return fullText;

  } catch (error: any) {
    console.error("Groq API Error:", error);
    
    let errorText = "Error: Unable to reach AI service.";
    
    if (error.message?.includes("Missing VITE_GROQ_API_KEY")) {
      errorText = "Error: Missing API Key. Set VITE_GROQ_API_KEY in .env";
    } else if (error.message?.includes("429")) {
      errorText = "Error: Groq quota exceeded. Try again later.";
    } else if (error.message?.includes("401")) {
      errorText = "Error: Invalid Groq API Key.";
    }
    
    onChunk(errorText);
    return errorText;
  }
};

