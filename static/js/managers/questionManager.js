/**
 * Question Manager
 * Handles all question-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";

export class QuestionManager {
  /**
   * Create a new QuestionManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.setupEventListeners();
    this.setupStateSubscriptions();
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // this.elements.markQuestionBtn.addEventListener("click", () =>
    //   this.markQuestion()
    // );
    // this.elements.markFollowupBtn.addEventListener("click", () =>
    //   this.markFollowup()
    // );
    // // Listen for question type changes
    // this.elements.questionTypeSelect.addEventListener("change", (event) => {
    //   appState.update("question.type", event.target.value);
    // });
    // // Listen for question notes changes
    // this.elements.questionNotesInput.addEventListener("input", (event) => {
    //   appState.update("question.notes", event.target.value);
    // });
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("question.current:changed", (question) => {
      console.log("Current question updated:", question);
    });

    StateEvents.on("question.currentExtractedQuestion:changed", (question) => {
      if (question) {
        this.elements.extractedQuestionContainer.innerHTML = `<p>${question}</p>`;
      } else {
        this.elements.extractedQuestionContainer.innerHTML =
          "<p><em>No coding question extracted yet...</em></p>";
      }
    });
  }

  /**
   * Mark a new question
   */
  async markQuestion() {
    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    try {
      const data = await apiRequest("/api/question/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Question marked:", data.question);
        appState.update("question.current", data.question);

        // Add a question marker to the transcription history
        const marker = document.createElement("div");
        marker.className = "question-marker";
        marker.textContent = `New ${questionType} Question`;

        if (notes) {
          const noteElem = document.createElement("div");
          noteElem.className = "question-note";
          noteElem.textContent = notes;
          marker.appendChild(noteElem);
        }

        this.elements.transcriptionHistory.appendChild(marker);
        this.elements.transcriptionHistory.scrollTop =
          this.elements.transcriptionHistory.scrollHeight;

        // Clear the notes field
        this.elements.questionNotesInput.value = "";
        appState.update("question.notes", "");
      } else {
        console.error("Error marking question:", data.message);
      }
    } catch (error) {
      console.error("Error marking question:", error);
    }
  }

  /**
   * Mark a follow-up question
   */
  async markFollowup() {
    const notes = appState.get("question.notes");

    try {
      const data = await apiRequest("/api/question/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Follow-up marked:", data.followup);

        // Add a follow-up marker to the transcription history
        const marker = document.createElement("div");
        marker.className = "followup-marker";
        marker.textContent = "Follow-up";

        const container = document.createElement("div");
        container.className = "transcription-item";
        container.appendChild(marker);

        if (notes) {
          const noteElem = document.createElement("div");
          noteElem.className = "question-note";
          noteElem.textContent = notes;
          container.appendChild(noteElem);
        }

        this.elements.transcriptionHistory.appendChild(container);
        this.elements.transcriptionHistory.scrollTop =
          this.elements.transcriptionHistory.scrollHeight;

        // Clear the notes field
        this.elements.questionNotesInput.value = "";
        appState.update("question.notes", "");
      } else {
        console.error("Error marking follow-up:", data.message);
      }
    } catch (error) {
      console.error("Error marking follow-up:", error);
    }
  }

  /**
   * Poll for question-related updates
   */
  poll() {
    // No polling needed for questions
  }
}
