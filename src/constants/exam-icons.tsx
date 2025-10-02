// Icon Constants for Language-Agnostic Exam Interface
// Using emoji for simplicity (can replace with SVG later)

export const ICONS = {
  // Actions
  CHECK: "✓",
  CROSS: "✗",
  CIRCLE: "⭕",
  ARROW_LEFT: "←",
  ARROW_RIGHT: "→",

  // Status
  STAR: "⭐",
  TROPHY: "🏆",
  CELEBRATE: "🎉",
  THUMBS_UP: "👍",
  BOOKS: "📚",

  // Question Types
  QUESTION: "❓",
  PENCIL: "✍️",
  DOCUMENT: "📝",
  TRUE_FALSE: "✓✗",

  // Progress
  CHART: "📊",
  CLOCK: "⏳",
  CALENDAR: "📅",

  // UI
  SETTINGS: "⚙️",
  WARNING: "⚠️",
  INFO: "ℹ️",
  LOADING: "⏳",

  // Navigation
  BACK: "←",
  FORWARD: "→",
  UP: "↑",
  DOWN: "↓",
} as const

export type IconKeys = keyof typeof ICONS
