export const QUESTION_NUMBER_BASE_OFFSET = 38400;

export const GNEWS_API_KEY = (process.env.GNEWS_API_KEY || "").trim();
export const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();


export const getGNewsApiKey = () => (process.env.GNEWS_API_KEY || "").trim();
export const getGeminiApiKey = () => (process.env.GEMINI_API_KEY || "").trim();


export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
] as const;

export const SIMPLE_FALLBACK_POOL = [
  {
    questionText: "Who is the greater cricket captain?",
    options: ["Rohit Sharma", "MS Dhoni"],
    category: "sports",
  },
  {
    questionText: "Best morning cardio for fat loss?",
    options: ["Brisk Walking", "Running"],
    category: "health",
  },
  {
    questionText: "Which workout time gives you more energy?",
    options: ["Early Morning", "Late Evening"],
    category: "health",
  },
  {
    questionText: "Can 10,000 daily steps keep you fit?",
    options: ["Yes, absolutely", "Need gym workout too"],
    category: "health",
  },
  {
    questionText: "Which cricket format do you enjoy more?",
    options: ["T20 Cricket", "Test Match"],
    category: "sports",
  },
  {
    questionText: "Running surface preference for joint comfort?",
    options: ["Outdoor Ground/Trail", "Treadmill"],
    category: "health",
  },
  {
    questionText: "Football GOAT debate?",
    options: ["Lionel Messi", "Cristiano Ronaldo"],
    category: "sports",
  },
  {
    questionText: "What do you drink during long workouts?",
    options: ["Electrolyte Drink", "Plain Water"],
    category: "health",
  },
  {
    questionText: "Pre-workout energy booster of choice?",
    options: ["Black Coffee", "Pre-workout Drink"],
    category: "health",
  },
  {
    questionText: "Which IPL franchise has a better legacy?",
    options: ["Chennai Super Kings", "Mumbai Indians"],
    category: "sports",
  },
  {
    questionText: "Fastest recovery method after intense exercise?",
    options: ["Quality Sleep", "Cold Shower / Ice"],
    category: "health",
  },
  {
    questionText: "Which fitness challenge is tougher?",
    options: ["Half Marathon (21 km)", "100 km Cycling"],
    category: "sports",
  },
  {
    questionText: "Are rest days as important as workout days?",
    options: ["Yes, crucial for recovery", "No, keep pushing daily"],
    category: "health",
  },
  {
    questionText: "Which is better for core strength?",
    options: ["Planks", "Crunches"],
    category: "health",
  },
  {
    questionText: "Who wins the next Premier League?",
    options: ["Manchester City", "Arsenal"],
    category: "sports",
  },
] as const;

export const NOTIFY_CHUNK = 25;
