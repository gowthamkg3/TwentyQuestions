import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. Please set it in your environment variables.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

// Function to select a random word using LLM
export async function selectRandomWord(options: WordSelectionOptions = {}): Promise<WordWithMetadata> {
  try {
    const categories = ["animal", "place", "object", "food", "person", "concept"];
    const category = options.category || categories[Math.floor(Math.random() * categories.length)];
    const difficulty = options.difficulty || "medium";
    
    // Keep a history of recently selected words to avoid repetition
    // This is normally managed with a database, but for this in-memory example,
    // we'll use the cache mechanism in the request to encourage variety
    const randomSeed = Math.floor(Math.random() * 100000).toString();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are a word selection assistant for a 'Twenty Questions' game. 
            Select a ${difficulty} difficulty ${category} that people can guess through yes/no questions.
            IMPORTANT: Each time you're asked, you must select a DIFFERENT word than you provided before.
            For easy difficulty, choose very common items that most people encounter daily.
            For medium difficulty, choose moderately common items that most people would recognize.
            For hard difficulty, choose more obscure or specific items that are challenging but still possible to guess.
            Also provide 3 hints of increasing helpfulness that could be revealed during the game.
            Return your response as a JSON object with the following structure:
            {
              "word": "the selected word",
              "category": "the category",
              "difficulty": "the difficulty level",
              "hints": ["hint1", "hint2", "hint3"]
            }`
        },
        {
          role: "user",
          content: `Select a random ${category} with ${difficulty} difficulty that would be appropriate for a game of Twenty Questions. 
          Be creative and unpredictable with your selection. Random seed: ${randomSeed}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 250,
      temperature: 1.0, // Increase temperature for more randomness
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.word) {
      throw new Error("Failed to get a word from the LLM");
    }
    
    return {
      word: result.word.toLowerCase().trim(),
      category: result.category || category,
      difficulty: result.difficulty || difficulty,
      hints: result.hints || ["No hints available"]
    };
  } catch (error) {
    console.error("Error in selectRandomWord:", error);
    // Fallback to a default list in case the API fails
    const fallbackWords = {
      animal: ["dog", "cat", "elephant", "tiger", "penguin"],
      place: ["beach", "mountain", "park", "library", "school"],
      object: ["chair", "computer", "bicycle", "piano", "book"],
      food: ["pizza", "apple", "chocolate", "bread", "coffee"],
      person: ["teacher", "doctor", "athlete", "singer", "artist"],
      concept: ["love", "freedom", "education", "creativity", "justice"]
    };
    
    const actualCategory = options.category || "object";
    const actualDifficulty = options.difficulty || "medium";
    const selectedCategory = actualCategory as keyof typeof fallbackWords;
    
    // Default to "object" if category is invalid
    const validCategory = fallbackWords[selectedCategory] ? selectedCategory : "object";
    const word = fallbackWords[validCategory][Math.floor(Math.random() * fallbackWords[validCategory].length)];
    
    return {
      word: word,
      category: actualCategory,
      difficulty: actualDifficulty,
      hints: [
        `This is a common ${actualCategory}`,
        `Think about ${actualCategory}s you encounter often`,
        `It starts with the letter '${word[0]}'`
      ]
    };
  }
}

// Function to answer a yes/no question about a word
export async function answerQuestion(word: string, question: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  try {
    // Construct the previous conversation context
    const conversationContext = previousQuestions.map(q => 
      `Q: ${q.question}\nA: ${q.answer}`
    ).join("\n\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are playing the 'Twenty Questions' game. You are thinking of the word "${word}". 
            Answer the player's yes/no questions truthfully, but keep your answers concise.
            Your answers should be brief but helpful, starting with 'Yes' or 'No' followed by a short 
            explanation if needed. Remember, this is a guessing game, so don't give away the answer directly.
            If the question is not a yes/no question, politely ask them to rephrase it as a yes/no question.`
        },
        {
          role: "user",
          content: conversationContext ? 
            `Previous questions and answers:\n\n${conversationContext}\n\nNew question: ${question}` : 
            `Question: ${question}`
        }
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content?.trim();
    
    if (!answer) {
      throw new Error("Failed to get an answer from the LLM");
    }
    
    return answer;
  } catch (error) {
    console.error("Error in answerQuestion:", error);
    // Fallback response in case the API fails
    if (question.toLowerCase().includes(word.toLowerCase())) {
      return "Yes, you're on the right track!";
    } else {
      return "No, that's not it. Please ask another yes/no question.";
    }
  }
}

// Function to check if final guess is correct
// V2 Mode: LLM generates a question about the word
export async function generateQuestion(word: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  try {
    // Construct the previous conversation context
    const conversationContext = previousQuestions.map(q => 
      `Q: ${q.question}\nA: ${q.answer}`
    ).join("\n\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are playing the 'Twenty Questions' game as the questioner. You're trying to guess what word the other player is thinking of.
            Your goal is to ask strategic yes/no questions that will help you narrow down what the word is.
            Based on the previous questions and answers, formulate your next yes/no question.
            Always phrase your question in a way that can be answered with a yes or no. 
            Do not attempt to guess the word directly until you are confident.
            Make your questions specific, avoiding vague or ambiguous phrasing.
            Only return the question itself, with no other text or explanation.`
        },
        {
          role: "user",
          content: conversationContext ? 
            `I'm thinking of something. Here are the previous questions and answers:\n\n${conversationContext}\n\nWhat is your next yes/no question?` : 
            `I'm thinking of something. What is your first yes/no question?`
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    const question = response.choices[0].message.content?.trim();
    
    if (!question) {
      throw new Error("Failed to get a question from the LLM");
    }
    
    return question;
  } catch (error) {
    console.error("Error in generateQuestion:", error);
    // Fallback questions in case the API fails
    const fallbackQuestions = [
      "Is it alive?",
      "Is it larger than a bread box?",
      "Can you find it in a home?",
      "Is it used for entertainment?",
      "Is it edible?",
      "Is it a common household item?",
      "Is it electronic?",
      "Is it found in nature?",
      "Can you wear it?",
      "Is it made of metal?"
    ];
    
    // Pick a question that hasn't been asked yet
    const askedQuestions = previousQuestions.map(q => q.question.toLowerCase());
    const availableQuestions = fallbackQuestions.filter(q => !askedQuestions.includes(q.toLowerCase()));
    
    if (availableQuestions.length > 0) {
      return availableQuestions[0];
    } else {
      return "Is it something people use daily?";
    }
  }
}

// V2 Mode: Second LLM attempts to answer a question about the word
export async function simulateHumanAnswer(word: string, question: string, previousQuestions: { question: string, answer: string }[] = []): Promise<string> {
  try {
    // Construct the previous conversation context
    const conversationContext = previousQuestions.map(q => 
      `Q: ${q.question}\nA: ${q.answer}`
    ).join("\n\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are playing the 'Twenty Questions' game. You are thinking of the word "${word}".
            You will be asked yes/no questions, and you must answer truthfully and concisely.
            Always begin your answer with either 'Yes' or 'No', followed by a brief explanation if necessary.
            Never reveal the word directly. Keep your answers short, factual, and helpful.`
        },
        {
          role: "user",
          content: conversationContext ? 
            `Previous questions and answers:\n\n${conversationContext}\n\nNew question: ${question}` : 
            `Question: ${question}`
        }
      ],
      max_tokens: 80,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content?.trim();
    
    if (!answer) {
      throw new Error("Failed to simulate an answer");
    }
    
    return answer;
  } catch (error) {
    console.error("Error in simulateHumanAnswer:", error);
    // Fallback response in case the API fails
    if (question.toLowerCase().includes(word.toLowerCase())) {
      return "Yes, you're getting close!";
    } else {
      return "No, that's not it.";
    }
  }
}

// LLM attempts to guess the word after gathering information
export async function makeGuess(previousQuestions: { question: string, answer: string }[]): Promise<string> {
  try {
    // Construct the previous conversation context
    const conversationContext = previousQuestions.map(q => 
      `Q: ${q.question}\nA: ${q.answer}`
    ).join("\n\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are playing the 'Twenty Questions' game as the guesser. Based on the yes/no questions 
            and answers provided, make your best guess at what the word is.
            Only respond with a single word or short phrase representing your guess, nothing more.`
        },
        {
          role: "user",
          content: `Based on these questions and answers, what do you think the word is?\n\n${conversationContext}`
        }
      ],
      max_tokens: 15,
      temperature: 0.5,
    });

    const guess = response.choices[0].message.content?.trim();
    
    if (!guess) {
      throw new Error("Failed to make a guess");
    }
    
    return guess;
  } catch (error) {
    console.error("Error in makeGuess:", error);
    return "Unknown";
  }
}

export async function checkFinalGuess(word: string, guess: string, previousQuestions: { question: string, answer: string }[] = []): Promise<{ correct: boolean, feedback: string }> {
  try {
    // Simple word match check
    const normalizedWord = word.toLowerCase().trim();
    const normalizedGuess = guess.toLowerCase().trim();
    
    // Direct match
    if (normalizedGuess === normalizedWord) {
      return { 
        correct: true, 
        feedback: `Yes, it's ${word}! You win!` 
      };
    }
    
    // LLM check for semantic equivalence or close matches
    const conversationContext = previousQuestions.map(q => 
      `Q: ${q.question}\nA: ${q.answer}`
    ).join("\n\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are judging a 'Twenty Questions' game. The secret word is "${word}". 
            The player's final guess is "${guess}". Determine if the guess is correct.
            Consider synonyms, common alternative names, or very close matches as correct.
            Respond with JSON in this format: { "correct": boolean, "explanation": "brief explanation" }`
        },
        {
          role: "user",
          content: conversationContext ? 
            `Game context:\n\n${conversationContext}\n\nIs the guess "${guess}" equivalent to or a common alternative name for "${word}"?` : 
            `Is the guess "${guess}" equivalent to or a common alternative name for "${word}"?`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 100,
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"correct": false, "explanation": "Unable to determine"}');
    
    return { 
      correct: result.correct, 
      feedback: result.correct 
        ? `Yes, it's ${word}! You win!` 
        : `No, that's not right. The word was ${word}. You lose.` 
    };
  } catch (error) {
    console.error("Error in checkFinalGuess:", error);
    // Fallback to simple exact match in case the API fails
    const isCorrect = guess.toLowerCase().trim() === word.toLowerCase().trim();
    return { 
      correct: isCorrect, 
      feedback: isCorrect 
        ? `Yes, it's ${word}! You win!` 
        : `No, that's not right. The word was ${word}. You lose.` 
    };
  }
}
