import React from "react";
import { Card } from "@/components/ui/card";
import { Question, LLMConfig } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: Question;
  isPositive: boolean;
  llmConfig?: LLMConfig;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, isPositive, llmConfig }) => {
  return (
    <Card className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
      <div className="font-open-sans text-sm">
        <div className="flex justify-between items-start">
          <p className="font-semibold text-gray-800">Q{question.id}: {question.text}</p>
          {llmConfig && question.isLLMQuestion && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
              {llmConfig.questioner === "openai" ? "OpenAI" : "Gemini"}
            </Badge>
          )}
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>{question.answer}</p>
          {llmConfig && (
            <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700">
              {llmConfig.answerer === "openai" ? "OpenAI" : "Gemini"}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuestionCard;
