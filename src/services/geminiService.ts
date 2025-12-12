import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, MessageRole } from "../types";

// Pull the key from Vite-exposed env (frontend-safe) instead of process.env
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  console.error("Missing VITE_API_KEY. Define it in a .env file.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY ?? "" });
const MODEL_NAME = 'gemini-2.5-flash';

export const streamAIResponse = async (
  history: ChatMessage[],
  currentContext: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    // We do NOT set systemInstruction here heavily because we want dynamic context per message.
    // Instead, we inject context into the user message invisible wrapper.
    const systemInstruction = `You are an AI assistant embedded in a text editor named PadAI. 
    Your goal is to help the user write, edit, and understand their notes.
    Be concise, direct, and helpful. Use plain text or simple markdown.`;

    // Filter history to last 12 messages to maintain context window
    const recentHistory = history
      .filter(m => !m.isStreaming) // Don't include currently streaming messages
      .slice(-12)
      .map(msg => ({
        role: msg.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
      },
      history: recentHistory,
    });

    // We wrap the user prompt with the CURRENT context of the document.
    // This ensures the AI sees edits made *after* the previous message.
    const messageWithContext = `
[CURRENT DOCUMENT CONTENT START]
${currentContext}
[CURRENT DOCUMENT CONTENT END]

User Query: ${userPrompt}
    `;

    const result = await chat.sendMessageStream({ message: messageWithContext });

    let fullText = "";
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onChunk(fullText);
      }
    }
    
    return fullText;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorText = "Error: Unable to reach AI service.";
    
    if (!API_KEY) {
      errorText = "Error: Missing API Key. Please check VITE_API_KEY in your .env file.";
    } else if (error.message?.includes('429')) {
      errorText = "Error: AI quota exceeded. Please try again later.";
    } else if (error.message?.includes('403')) {
      errorText = "Error: API Key invalid or restricted.";
    }
    
    onChunk(errorText);
    return errorText;
  }
};