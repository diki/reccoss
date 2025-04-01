/**
 * Centralized DOM element references
 * This file exports all DOM elements used throughout the application
 */

/**
 * Initialize and return all DOM element references
 * @returns {Object} Object containing all DOM element references
 */
export function initDomElements() {
  return {
    // Recording controls
    startRecordingBtn: document.getElementById("start-recording"),
    stopRecordingBtn: document.getElementById("stop-recording"),
    recordingStatus: document.getElementById("recording-status"),

    // Screenshot controls
    takeScreenshotBtn: document.getElementById("take-screenshot"),
    extractWithGeminiBtn: document.getElementById("extract-with-gemini"),
    getDesignQuestionBtn: document.getElementById("get-design-question"),
    extractWithOpenaiBtn: document.getElementById("extract-with-openai"),
    extractReactQuestionBtn: document.getElementById("extract-react-question"),
    screenshotsContainer: document.getElementById("screenshots"),

    // Question controls
    markQuestionBtn: document.getElementById("mark-question"),
    markFollowupBtn: document.getElementById("mark-followup"),
    questionTypeSelect: document.getElementById("question-type"),
    questionNotesInput: document.getElementById("question-notes"),
    extractedQuestionContainer: document.getElementById("extracted-question"),

    // Transcription elements
    latestTranscription: document.getElementById("latest-transcription"),
    interviewerTranscription: document.getElementById(
      "interviewer-transcription"
    ),
    transcriptionHistory: document.getElementById("transcription-history"),

    // Solution controls
    getSolutionBtn: document.getElementById("get-solution"),
    getSolutionWithOpenaiBtn: document.getElementById(
      "get-solution-with-openai"
    ),
    getSolutionWithGeminiBtn: document.getElementById(
      "get-solution-with-gemini"
    ),
    getReactSolutionWithGeminiBtn: document.getElementById(
      "get-react-solution-with-gemini"
    ),
    getReactSolutionWithClaudeBtn: document.getElementById(
      "get-react-solution-with-claude"
    ),
    getSolutionFollowupBtn: document.getElementById("get-solution-followup"),
    getSolutionFollowupWithGeminiBtn: document.getElementById(
      "get-solution-followup-with-gemini"
    ),

    // Solution display
    solutionTabs: document.getElementById("solution-tabs"),
    explanationTab: document.getElementById("explanation-tab"),
    codeContent: document.getElementById("code-content"),
    complexityTab: document.getElementById("complexity-tab"),
    strategyTab: document.getElementById("strategy-tab"),

    // Code tab
    codeTab: document.getElementById("code-tab"),

    // UI controls
    resetAllBtn: document.getElementById("reset-all"),
    togglePanelBtn: document.getElementById("toggle-panel"),
    leftPanel: document.querySelector(".left-panel"),

    // Tab buttons
    tabButtons: document.querySelectorAll(".tab-button"),
    tabContents: document.querySelectorAll(".tab-content"),
  };
}
