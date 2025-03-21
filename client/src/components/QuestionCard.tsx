import React from "react";
import { Card } from "@/components/ui/card";
import { Question } from "@/lib/types";

interface QuestionCardProps {
  question: Question;
  isPositive: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, isPositive }) => {
  return (
    <Card className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
      <div className="font-open-sans text-sm">
        <p className="font-semibold text-primary">Q{question.id}: {question.text}</p>
        <p className={`mt-1 ${isPositive ? "text-secondary" : "text-accent"}`}>{question.answer}</p>
      </div>
    </Card>
  );
};

export default QuestionCard;
