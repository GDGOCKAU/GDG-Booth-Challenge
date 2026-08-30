const q = (title, type, category, difficulty, answer, content = {}, points = 10, maxAttempts = 1, penalty = 0, description = "") => ({
  title, type, category, difficulty, answer, content, points, maxAttempts, penalty, description,
});

export const seedChallenges = [
  {
    title: "Programming Challenge", category: "Programming", difficulty: "Medium",
    description: "Ten quick questions across programming fundamentals and debugging.",
    startMessage: "Think clearly, every attempt counts.", completionMessage: "Great debugging!",
    questions: [
      q("What does HTTP stand for?", "multiple_choice", "Technology", "Easy", { correct: "0" }, { options: ["HyperText Transfer Protocol", "High Transfer Text Process", "Hyper Terminal Transfer Program", "None of the above"] }),
      q("What is the Java program entry method?", "short_answer", "Programming", "Easy", { accepted: ["main"], caseSensitive: false }, {}, 10, 3, 2),
      q("What does this print?", "code_output", "Programming", "Easy", { accepted: ["2"] }, { language: "java", code: "int x = 5;\nint y = 2;\nSystem.out.println(x / y);" }, 10, 2, 3),
      q("Which are JavaScript libraries or frameworks?", "multiple_select", "Programming", "Medium", { correct: ["0", "1"] }, { options: ["React", "Vue", "PostgreSQL", "Docker"] }, 12, 2, 3),
      q("A stack follows FIFO order.", "true_false", "Programming", "Easy", { correct: "false" }, { options: ["true", "false"] }),
      q("Which keyword creates a constant binding in JavaScript?", "short_answer", "Programming", "Easy", { accepted: ["const"] }, {}, 10, 2, 2),
      q("What is the output?", "code_output", "Programming", "Medium", { accepted: ["3"] }, { language: "javascript", code: "console.log([1, 2, 3].length);" }, 12, 2, 3),
      q("Select the valid HTTP methods.", "multiple_select", "Technology", "Medium", { correct: ["0", "1", "2"] }, { options: ["GET", "POST", "PATCH", "SEND"] }, 14, 2, 4),
      q("Fix the function so it returns the sum.", "code_fix", "Programming", "Hard", { accepted: ["function add(a, b) { return a + b; }", "const add = (a, b) => a + b;"], caseSensitive: false }, { language: "javascript", starterCode: "function add(a, b) {\n  return a - b;\n}" }, 18, 3, 5),
      q("Binary search requires sorted input.", "true_false", "Programming", "Medium", { correct: "true" }, { options: ["true", "false"] }, 12),
    ],
  },
  {
    title: "General Knowledge", category: "General", difficulty: "Easy",
    description: "A light mix of science, geography, and everyday knowledge.",
    questions: [
      q("What is the largest planet?", "multiple_choice", "General", "Easy", { correct: "1" }, { options: ["Earth", "Jupiter", "Mars", "Venus"] }),
      q("Water freezes at 0°C at sea level.", "true_false", "General", "Easy", { correct: "true" }, { options: ["true", "false"] }),
      q("Which continent contains Saudi Arabia?", "short_answer", "General", "Easy", { accepted: ["Asia", "آسيا"] }),
      q("Which are primary colors of light?", "multiple_select", "General", "Medium", { correct: ["0", "1", "2"] }, { options: ["Red", "Green", "Blue", "Yellow"] }),
      q("How many days are in a leap year?", "short_answer", "General", "Easy", { accepted: ["366"] }),
      q("The Pacific is the largest ocean.", "true_false", "General", "Easy", { correct: "true" }, { options: ["true", "false"] }),
      q("What gas do plants absorb?", "multiple_choice", "General", "Easy", { correct: "2" }, { options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"] }),
      q("What is the capital of Japan?", "short_answer", "General", "Easy", { accepted: ["Tokyo", "طوكيو"] }),
      q("Which is a mammal?", "multiple_choice", "General", "Easy", { correct: "0" }, { options: ["Dolphin", "Shark", "Octopus", "Trout"] }),
      q("Light travels faster than sound.", "true_false", "General", "Easy", { correct: "true" }, { options: ["true", "false"] }),
    ],
  },
  {
    title: "Google & Technology", category: "Google", difficulty: "Medium",
    description: "Google products, web technology, and developer culture.",
    questions: [
      q("Which company created Android?", "multiple_choice", "Google", "Easy", { correct: "0" }, { options: ["Google", "IBM", "Oracle", "Mozilla"] }),
      q("What does API stand for?", "short_answer", "Technology", "Easy", { accepted: ["Application Programming Interface"] }),
      q("Chrome uses the Chromium project.", "true_false", "Google", "Easy", { correct: "true" }, { options: ["true", "false"] }),
      q("Which are Google developer products?", "multiple_select", "Google", "Medium", { correct: ["0", "1", "2"] }, { options: ["Firebase", "Flutter", "Angular", "Laravel"] }),
      q("Which protocol secures normal web traffic?", "multiple_choice", "Technology", "Easy", { correct: "1" }, { options: ["FTP", "HTTPS", "SMTP", "SSH only"] }),
      q("What language is Flutter primarily written with?", "short_answer", "Google", "Medium", { accepted: ["Dart"] }),
      q("V8 is Google's JavaScript engine.", "true_false", "Google", "Medium", { correct: "true" }, { options: ["true", "false"] }),
      q("What does CSS style?", "multiple_choice", "Technology", "Easy", { correct: "2" }, { options: ["Database rows", "Server processes", "Web page presentation", "DNS zones"] }),
      q("Which are valid cloud service models?", "multiple_select", "Technology", "Medium", { correct: ["0", "1", "2"] }, { options: ["IaaS", "PaaS", "SaaS", "CaaC"] }),
      q("What does GDG stand for?", "short_answer", "Google", "Easy", { accepted: ["Google Developer Groups", "Google Developer Group"] }),
    ],
  },
  {
    title: "AI Challenge", category: "AI", difficulty: "Medium",
    description: "Short questions about practical AI and machine learning.",
    questions: [
      q("Machine learning is a subset of AI.", "true_false", "AI", "Easy", { correct: "true" }, { options: ["true", "false"] }),
      q("What does LLM stand for?", "short_answer", "AI", "Easy", { accepted: ["Large Language Model"] }),
      q("Which are common ML tasks?", "multiple_select", "AI", "Medium", { correct: ["0", "1", "2"] }, { options: ["Classification", "Regression", "Clustering", "Compilation"] }),
      q("Which split is used to estimate final model performance?", "multiple_choice", "AI", "Medium", { correct: "2" }, { options: ["Training", "Prompt", "Test", "Cache"] }),
      q("Overfitting means a model generalizes perfectly.", "true_false", "AI", "Medium", { correct: "false" }, { options: ["true", "false"] }),
      q("Name the process of converting text into numerical units for an LLM.", "short_answer", "AI", "Hard", { accepted: ["tokenization"] }, {}, 15, 3, 4),
      q("A confusion matrix is used for classification evaluation.", "true_false", "AI", "Medium", { correct: "true" }, { options: ["true", "false"] }),
      q("Which technique can reduce overfitting?", "multiple_choice", "AI", "Medium", { correct: "1" }, { options: ["Data leakage", "Regularization", "Removing validation", "Always increasing epochs"] }),
      q("Which are generative AI outputs?", "multiple_select", "AI", "Easy", { correct: ["0", "1", "2"] }, { options: ["Text", "Images", "Audio", "Only labels"] }),
      q("AI-generated media should be treated as automatically factual.", "true_false", "AI", "Easy", { correct: "false" }, { options: ["true", "false"] }),
    ],
  },
  {
    title: "Impossible Challenge", category: "Programming", difficulty: "Impossible",
    description: "One question. Maximum focus.", completionMessage: "You faced the impossible.",
    questions: [q("What is the time complexity of finding the median of two sorted arrays using the optimal partition algorithm?", "short_answer", "Programming", "Impossible", { accepted: ["O(log(min(m,n)))", "O(log min(m,n))"], caseSensitive: false }, {}, 100, 5, 20)],
  },
];

export async function seedDatabase(client) {
  const existing = await client.query("SELECT COUNT(*)::int AS count FROM challenges");
  if (existing.rows[0].count > 0) return;
  for (const challenge of seedChallenges) {
    const insertedChallenge = await client.query(
      `INSERT INTO challenges (title, description, category, difficulty, start_message, completion_message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [challenge.title, challenge.description, challenge.category, challenge.difficulty, challenge.startMessage || "", challenge.completionMessage || ""],
    );
    for (let index = 0; index < challenge.questions.length; index += 1) {
      const item = challenge.questions[index];
      const insertedQuestion = await client.query(
        `INSERT INTO questions (title, description, type, category, difficulty, points, max_attempts, penalty, content, answer)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [item.title, item.description, item.type, item.category, item.difficulty, item.points, item.maxAttempts, item.penalty, item.content, item.answer],
      );
      await client.query("INSERT INTO challenge_questions (challenge_id, question_id, position) VALUES ($1,$2,$3)", [insertedChallenge.rows[0].id, insertedQuestion.rows[0].id, index]);
    }
  }
}
