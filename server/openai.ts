import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Function to select a random word using LLM
export async function selectRandomWord(): Promise<string> {
  try {
    const categories = ["animal", "place", "object", "food"];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a word selection assistant for a 'Twenty Questions' game. Select a single common physical entity (a noun) that people can guess through yes/no questions. Return ONLY the word and nothing else - no explanations, no quotes, just the single word."
        },
        {
          role: "user",
          content: `Select a random ${category} that would be appropriate for a game of Twenty Questions. It should be a common item that most people would be familiar with.`
        }
      ],
      max_tokens: 5,
      temperature: 0.7,
    });

    const word = response.choices[0].message.content?.trim().toLowerCase();
    
    if (!word) {
      throw new Error("Failed to get a word from the LLM");
    }
    
    return word;
  } catch (error) {
    console.error("Error in selectRandomWord:", error);
    // Fallback to a default list in case the API fails
    const fallbackWords = [
      "dog", "cat", "elephant", "car", "computer", "pizza", 
      "mountain", "bicycle", "piano", "book", "tree", "chair"
    ];
    return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
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
