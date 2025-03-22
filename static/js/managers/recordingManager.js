/**
 * Recording Manager
 * Handles all recording-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";

export class RecordingManager {
  /**
   * Create a new RecordingManager
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
    this.elements.startRecordingBtn.addEventListener("click", () =>
      this.startRecording()
    );
    this.elements.stopRecordingBtn.addEventListener("click", () =>
      this.stopRecording()
    );
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("recording.isRecording:changed", (isRecording) => {
      this.updateRecordingUI(isRecording);
    });
  }

  /**
   * Start recording
   */
  async startRecording() {
    try {
      const data = await apiRequest("/api/recording/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_name: "BlackHole",
          record_seconds: 5,
          duration: null, // Record indefinitely
        }),
      });

      console.log("Recording started:", data);
      appState.update("recording.isRecording", true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    try {
      const data = await apiRequest("/api/recording/stop", {
        method: "POST",
      });

      console.log("Recording stopped:", data);
      appState.update("recording.isRecording", false);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }

  /**
   * Check recording status
   */
  async checkRecordingStatus() {
    try {
      const data = await apiRequest("/api/recording/status");
      appState.update("recording.isRecording", data.is_recording);
    } catch (error) {
      console.error("Error checking recording status:", error);
    }
  }

  /**
   * Update recording UI based on recording state
   * @param {boolean} isRecording - Whether recording is active
   */
  updateRecordingUI(isRecording) {
    const { recordingStatus, startRecordingBtn, stopRecordingBtn } =
      this.elements;

    if (isRecording) {
      recordingStatus.textContent = "Status: Recording";
      recordingStatus.classList.add("recording");
      startRecordingBtn.disabled = true;
      stopRecordingBtn.disabled = false;
    } else {
      recordingStatus.textContent = "Status: Not recording";
      recordingStatus.classList.remove("recording");
      startRecordingBtn.disabled = false;
      stopRecordingBtn.disabled = true;
    }
  }

  /**
   * Poll for updates
   */
  poll() {
    this.checkRecordingStatus();
  }
}
