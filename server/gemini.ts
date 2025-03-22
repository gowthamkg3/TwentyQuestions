
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with safety settings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-lite",
  generationConfig,
  safetySettings,
});

interface WordSelectionOptions {
  category?: string;
  difficulty?: string;
}

interface WordWithMetadata {
  word: string;
  category: string;
  difficulty: string;
  hints: string[];
}

export async function selectRandomWordGemini(options: WordSelectionOptions = {}): Promise<WordWithMetadata> {
  const { category, difficulty } = options;
  
  const prompt = `
    Select a random word for a 20 Questions game.
    ${category ? `The word should be in the category: ${category}.` : ''}
    ${difficulty ? `The difficulty level should be: ${difficulty}.` : ''}
    
    Please provide the word and information in the following strict JSON format:
    {
      "word": "the chosen word",
      "category": "the category of the word",
      "difficulty": "easy, medium, or hard",
      "hints": ["hint 1", "hint 2", "hint 3"]
    }
    
    Ensure the word is specific enough to be guessable but challenging. 
    Provide 3 helpful hints that give clues without giving away the answer.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Gemini response");
    }
    
    const wordData = JSON.parse(jsonMatch[0]) as WordWithMetadata;
    return wordData;
  } catch (error) {
    console.error("Error selecting random word with Gemini:", error);
    // Fallback in case of error
    return {
      word: "computer",
      category: category || "object",
      difficulty: difficulty || "medium",
      hints: [
        "You can use it to access the internet",
        "It processes information electronically",
        "It has a keyboard and screen"
      ]
    };
  }
}

export async function answerQuestionGemini(word: string, question: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  const previousQuestionsText = previousQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
    .join('\n');

  const prompt = `
    You are playing a game of 20 Questions. You are thinking of the word "${word}".
    
    EXTREMELY IMPORTANT: Your answers must be VERY SHORT - no more than 10 words total.
    
    Rules:
    1. Start every answer with either "Yes" or "No" only
    2. Add at most 1-5 additional words if absolutely necessary
    3. NEVER add explanations, justifications, or hints
    4. NEVER use more than 10 words total
    5. If the question isn't yes/no, just say "Please ask a yes/no question"
    
    Previous questions and answers:
    ${previousQuestionsText}
    
    Current question: "${question}"
    
    Examples of good answers:
    - "Yes"
    - "No"
    - "Yes, sometimes"
    - "No, never"
    - "Please ask a yes/no question"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error answering question with Gemini:", error);
    return "No";
  }
}

export async function generateQuestionGemini(word: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  const previousQuestionsText = previousQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
    .join('\n');

  const prompt = `
    You are playing a game of 20 Questions. You are trying to guess a word using yes/no questions.
    The word you are trying to guess is "${word}". But pretend you don't know what the word is.
    
    Previous questions and answers:
    ${previousQuestionsText}
    
    Based on the previous questions and answers, generate ONE strategic yes/no question that would help you narrow down what the word is.
    Your question should be concise and clear. Don't make statements or explanations, just ask the question.
    Keep your questions purely yes/no - avoid "how", "why", "what", etc.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating question with Gemini:", error);
    return "Is it a living thing?";
  }
}

export async function simulateHumanAnswerGemini(word: string, question: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  const previousQuestionsText = previousQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
    .join('\n');

  const prompt = `
    You are simulating a human player in a game of 20 Questions. You are thinking of the word "${word}".
    
    EXTREMELY IMPORTANT: Your answers must be VERY SHORT - no more than 10 words total.
    
    Rules:
    1. Start every answer with either "Yes" or "No" only
    2. Add at most 1-5 additional words if absolutely necessary
    3. NEVER add explanations, justifications, or hints
    4. NEVER use more than 10 words total
    5. If the question isn't yes/no, just say "Please ask a yes/no question"
    
    Previous questions and answers:
    ${previousQuestionsText}
    
    Current question from the AI: "${question}"
    
    Examples of good answers:
    - "Yes"
    - "No"
    - "Yes, sometimes"
    - "No, never"
    - "Please ask a yes/no question"
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error simulating human answer with Gemini:", error);
    return "No";
  }
}

export async function makeGuessGemini(previousQuestions: { question: string, answer: string }[]): Promise<string> {
  const previousQuestionsText = previousQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
    .join('\n');

  const prompt = `
    You are playing a game of 20 Questions. Based on the following questions and answers,
    make your best guess at what the word might be.
    
    Questions and answers so far:
    ${previousQuestionsText}
    
    Analyze the information above and make your single best guess. Provide only the word, nothing else.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error making guess with Gemini:", error);
    return "apple";
  }
}

export async function checkFinalGuessGemini(word: string, guess: string, previousQuestions: { question: string, answer: string }[] = []): Promise<{ correct: boolean, feedback: string }> {
  const previousQuestionsText = previousQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
    .join('\n');

  // Enhanced word match checking with normalization
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()                  // Convert to lowercase
      .trim()                         // Remove leading/trailing whitespace
      .replace(/[^\w\s]/g, '')       // Remove special characters
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();                        // Trim again after whitespace normalization
  };
  
  const normalizedWord = normalizeText(word);
  const normalizedGuess = normalizeText(guess);
  
  // Log for debugging
  console.log(`[Gemini] Comparing normalized word: "${normalizedWord}" with guess: "${normalizedGuess}"`);
  
  const isCorrect = normalizedWord === normalizedGuess;

  const prompt = `
    You are evaluating a guess in a game of 20 Questions.
    The actual word is "${word}".
    The player guessed "${guess}".
    The guess is ${isCorrect ? "correct" : "incorrect"}.
    
    Questions and answers from the game:
    ${previousQuestionsText}
    
    Provide feedback on the guess in a friendly and encouraging tone. If the guess is wrong,
    explain what the correct answer was and provide a brief explanation of how the questions
    and answers might have led to or away from the correct answer.
    
    Your response should be concise (2-3 sentences).
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      correct: isCorrect,
      feedback: response.text().trim()
    };
  } catch (error) {
    console.error("Error checking final guess with Gemini:", error);
    if (isCorrect) {
      return {
        correct: true,
        feedback: "Congratulations! You correctly guessed the word!"
      };
    } else {
      return {
        correct: false,
        feedback: `Sorry, the correct word was "${word}". Better luck next time!`
      };
    }
  }
}
