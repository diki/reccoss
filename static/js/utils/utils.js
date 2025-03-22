/**
 * Utility functions for the application
 */

/**
 * Detect programming language from code
 * @param {string} code - The code to analyze
 * @returns {string} The detected language
 */
export function detectLanguage(code) {
  // Default to javascript if we can't detect
  let language = "javascript";

  // Check for Python
  if (
    code.includes("def ") ||
    (code.includes("import ") && code.includes(":") && !code.includes("{"))
  ) {
    language = "python";
  }
  // Check for Java
  else if (
    (code.includes("public class ") || code.includes("private class ")) &&
    code.includes("public static void main")
  ) {
    language = "java";
  }
  // Check for C++
  else if (
    code.includes("#include <") &&
    (code.includes("std::") || code.includes("using namespace std;"))
  ) {
    language = "cpp";
  }
  // Check for C
  else if (
    code.includes("#include <") &&
    code.includes("int main(") &&
    !code.includes("class ") &&
    !code.includes("std::")
  ) {
    language = "c";
  }
  // JavaScript/TypeScript detection
  else if (
    code.includes("function ") ||
    code.includes("const ") ||
    code.includes("let ") ||
    code.includes("var ") ||
    code.includes("=>")
  ) {
    language = "javascript";
  }

  return language;
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Clean code by removing code block markers
 * @param {string} code - The code with possible markdown markers
 * @returns {string} Clean code without markers
 */
export function cleanCodeMarkdown(code) {
  return code.replace(/^```typescript\n|^```\w*\n|```$/g, "");
}

/**
 * Make an API request with error handling
 * @param {string} url - The API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The response data
 */
export async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API request failed");
    }

    return data;
  } catch (error) {
    console.error(`API Error (${url}):`, error);
    throw error;
  }
}
