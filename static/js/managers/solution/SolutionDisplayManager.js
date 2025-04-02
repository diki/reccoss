import { cleanCodeMarkdown, detectLanguage } from "../../utils/utils.js";

/**
 * Manages the display of solutions and follow-up solutions in the UI.
 */
export class SolutionDisplayManager {
  /**
   * Create a new SolutionDisplayManager
   * @param {Object} elements - DOM elements relevant to solution display
   */
  constructor(elements) {
    this.elements = elements;
  }

  /**
   * Display the main solution (standard structured solution and/or raw React solution).
   * @param {Object | null} solution - The structured solution object (or null).
   * @param {string | null} reactSolution - The raw React solution string (or null).
   */
  displaySolution(solution, reactSolution) {
    // Update the standard solution tabs if a structured solution object exists
    if (solution) {
      this._updateTabContent(
        this.elements.explanationTab,
        solution.explanation,
        "No explanation available."
      );
      this._updateTabContent(
        document.getElementById("interview-style-tab"),
        solution.solution,
        "No interview-style explanation available.",
        "interview-solution" // Add specific class for interview style
      );
      this._updateCodeTab(
        document.getElementById("code-content"),
        solution.code
      );
      this._updateTabContent(
        this.elements.complexityTab,
        solution.complexity,
        "No complexity analysis available."
      );
      this._updateTabContent(
        this.elements.strategyTab,
        solution.strategy,
        "No interview strategy available."
      );
    } else {
      // If no standard solution object, clear the tabs
      this._clearTabContent(this.elements.explanationTab);
      this._clearTabContent(document.getElementById("interview-style-tab"));
      this._clearCodeTab(document.getElementById("code-content"));
      this._clearTabContent(this.elements.complexityTab);
      this._clearTabContent(this.elements.strategyTab);
    }

    // Update the dedicated React Solution section if reactSolution exists
    this._updateReactSolutionDisplay(reactSolution);
  }

  /**
   * Display the standard follow-up solution.
   * @param {Object} solution - The follow-up solution object.
   */
  displayFollowupSolution(solution) {
    console.log("Displaying standard follow-up solution");
    this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up"; // Reset button text
    this._updateFollowupTabs(
      "followup-explanation-tab",
      "followup-code-tab",
      solution
    );
  }

  /**
   * Display the Gemini follow-up solution.
   * @param {Object} solution - The follow-up solution object.
   */
  displayFollowupSolutionWithGemini(solution) {
    console.log("Displaying Gemini follow-up solution");
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Solve Follow-up with GEMini"; // Reset button text
    this._updateFollowupTabs(
      "gemini-followup-explanation-tab",
      "gemini-followup-code-tab",
      solution
    );
  }

  /**
   * Display the raw Claude React follow-up solution.
   * @param {string} rawSolution - The raw response string from Claude.
   */
  displayClaudeReactFollowupSolution(rawSolution) {
    console.log("Displaying Claude React follow-up solution");
    this.elements.getFollowupSolutionClaudeReactBtn.textContent =
      "Get Followup Solution (Claude)"; // Reset button text

    if (this.elements.followupReactContent) {
      if (rawSolution) {
        // Display the raw text directly, preserving line breaks with <pre>
        const preElement = document.createElement("pre");
        preElement.textContent = rawSolution;
        this.elements.followupReactContent.innerHTML = ""; // Clear previous
        this.elements.followupReactContent.appendChild(preElement);
      } else {
        this.elements.followupReactContent.innerHTML =
          "<p><em>No followup solution available.</em></p>";
      }
    }
  }

  // --- Private Helper Methods ---

  /**
   * Updates the innerHTML of a tab element with formatted content or a default message.
   * @param {HTMLElement} tabElement - The DOM element for the tab content.
   * @param {string | null} content - The content string (can contain newlines).
   * @param {string} defaultMessage - Message to display if content is null or empty.
   * @param {string} [pClass] - Optional class to add to the paragraph tag.
   * @private
   */
  _updateTabContent(tabElement, content, defaultMessage, pClass = "") {
    if (tabElement) {
      if (content) {
        const className = pClass ? ` class="${pClass}"` : "";
        // Replace newlines with <br> for HTML display
        tabElement.innerHTML = `<p${className}>${content.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        tabElement.innerHTML = `<p><em>${defaultMessage}</em></p>`;
      }
    }
  }

  /**
   * Clears the content of a tab element, showing a default "No solution available" message.
   * @param {HTMLElement} tabElement - The DOM element for the tab content.
   * @private
   */
  _clearTabContent(tabElement) {
    if (tabElement) {
      tabElement.innerHTML = "<p><em>No solution available.</em></p>";
    }
  }

  /**
   * Updates the code tab with formatted and highlighted code.
   * @param {HTMLElement} codeElement - The `<code>` element within the `<pre>` tag.
   * @param {string | null} codeContent - The raw code string (may include markdown).
   * @private
   */
  _updateCodeTab(codeElement, codeContent) {
    if (codeElement) {
      if (codeContent) {
        const cleanCode = cleanCodeMarkdown(codeContent);
        const language = detectLanguage(cleanCode);
        codeElement.className = `language-${language}`;
        codeElement.textContent = cleanCode; // Use textContent to preserve formatting and prevent injection

        // Trigger Prism highlighting
        if (window.Prism) {
          window.Prism.highlightElement(codeElement);
        }
      } else {
        this._clearCodeTab(codeElement);
      }
    }
  }

  /**
   * Clears the code tab content.
   * @param {HTMLElement} codeElement - The `<code>` element.
   * @private
   */
  _clearCodeTab(codeElement) {
    if (codeElement) {
      codeElement.className = ""; // Remove language class
      codeElement.innerHTML = "<em>No code solution available.</em>";
    }
  }

  /**
   * Updates the dedicated React solution display area.
   * @param {string | null} reactSolution - The raw React code string.
   * @private
   */
  _updateReactSolutionDisplay(reactSolution) {
    const reactSolutionContainer = document.getElementById(
      "react-solution-content"
    );
    if (reactSolutionContainer) {
      if (reactSolution) {
        const cleanReactCode = cleanCodeMarkdown(reactSolution);
        const preElement = document.createElement("pre");
        const codeElement = document.createElement("code");
        codeElement.className = "language-jsx"; // Assume JSX
        codeElement.textContent = cleanReactCode;
        preElement.appendChild(codeElement);
        reactSolutionContainer.innerHTML = ""; // Clear previous
        reactSolutionContainer.appendChild(preElement);

        if (window.Prism) {
          window.Prism.highlightElement(codeElement);
        }
      } else {
        reactSolutionContainer.innerHTML =
          "<p><em>No React solution available.</em></p>";
      }
    }
  }

  /**
   * Updates the explanation and code tabs for a follow-up solution.
   * @param {string} explanationTabId - ID of the explanation tab content div.
   * @param {string} codeTabId - ID of the code tab content div.
   * @param {Object} solution - The follow-up solution object.
   * @private
   */
  _updateFollowupTabs(explanationTabId, codeTabId, solution) {
    const explanationTab = document.getElementById(explanationTabId);
    const codeTab = document.getElementById(codeTabId);

    if (explanationTab && codeTab) {
      let explanationHtml = "";
      // Add technical explanation if present
      if (solution.explanation) {
        const explanationHeader = solution.solution
          ? "<h4>Technical Explanation:</h4>"
          : ""; // Only add header if interview style also exists
        explanationHtml += `${explanationHeader}<p>${solution.explanation.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      }

      // Add interview-style explanation if present
      if (solution.solution) {
        explanationHtml += `
          <h4>Interview-Style Explanation:</h4>
          <p class="interview-solution">${solution.solution.replace(
            /\n/g,
            "<br>"
          )}</p>
        `;
      }

      // Set explanation tab content
      if (explanationHtml) {
        explanationTab.innerHTML = explanationHtml;
      } else {
        explanationTab.innerHTML = "<p><em>No explanation available.</em></p>";
      }

      // Update code tab
      if (solution.code) {
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);
        const codeElement = document.createElement("code"); // Create code element dynamically
        codeElement.className = `language-${language}`;
        codeElement.textContent = cleanCode;

        const preElement = document.createElement("pre");
        preElement.appendChild(codeElement);

        codeTab.innerHTML = ""; // Clear previous content
        codeTab.appendChild(preElement);

        if (window.Prism) {
          window.Prism.highlightElement(codeElement);
        }
      } else {
        codeTab.innerHTML =
          "<pre><code><em>No code solution available.</em></code></pre>";
      }
    }
  }
}
