"use client";

import { useState } from "react";

export default function DifficultySelector() {
  const [difficulty, setDifficulty] = useState("Beginner");

  const difficultyContent = {
    Beginner: {
      title: "Beginner Mode",
      description:
        "Learn algorithms with detailed explanations, step-by-step guidance, and easy-to-understand concepts.",
    },

    Intermediate: {
      title: "Intermediate Mode",
      description:
        "Explore algorithms with balanced explanations, implementation ideas, and practical understanding.",
    },

    Advanced: {
      title: "Advanced Mode",
      description:
        "Focus on optimization techniques, time and space complexity, and advanced algorithm strategies.",
    },
  };

  return (
    <div className="max-w-5xl mx-auto mt-6 mb-6 p-6 rounded-xl shadow-md bg-white dark:bg-[#1c1d1f] border border-gray-300 dark:border-gray-700">
      
      {/* Heading */}
      <h2 className="text-2xl font-bold text-center mb-5 text-gray-900 dark:text-white">
        Select Your Learning Level
      </h2>

      {/* Difficulty Buttons */}
      <div className="flex justify-center flex-wrap gap-3">
        {Object.keys(difficultyContent).map((level) => (
          <button
            key={level}
            onClick={() => setDifficulty(level)}
            className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${
              difficulty === level
                ? "bg-blue-600 text-white scale-105"
                : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-blue-200 dark:hover:bg-gray-700"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Selected Difficulty Details */}
      <div className="mt-6 p-5 rounded-lg bg-blue-50 dark:bg-gray-800 text-center">
        <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">
          {difficultyContent[difficulty].title}
        </h3>

        <p className="mt-2 text-gray-700 dark:text-gray-300">
          {difficultyContent[difficulty].description}
        </p>
      </div>
    </div>
  );
}