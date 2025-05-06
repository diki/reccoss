from typing import Optional, Dict

def get_solution_prompt(question: str) -> str:
    """Returns the prompt for getting coding solutions from Gemini"""
    return f"""
I need a solution to the following coding problem:

{question}

Please provide a comprehensive solution with the following components:
1. Explanation of your approach step by step (technical explanation)
2. A friendly, conversational but concise explanation as if you're in an interview explaining your approach
3. Code implementation in TypeScript with proper type annotations
   - IMPORTANT: Place all comments ABOVE the code lines, not on the same line as the code
   - Example of correct comment formatting:
     // This is a comment explaining what the next line does
     const result = calculateSomething(input);
   - NOT like this:
     const result = calculateSomething(input); // This comment is on the same line as code
4. Time and space complexity analysis
5. Interview strategy tips for this problem
"""

def get_coding_question_extraction_prompt() -> str:
    """Returns the prompt for extracting coding questions from screenshots"""
    return "Extract the coding question from this screenshot. Return only the question text without any additional commentary or explanation."

def get_design_question_extraction_prompt() -> str:
    """Returns the prompt for extracting system design questions from screenshots"""
    return """Extract the complete system design question from this screenshot. Make sure to include:
1. The main question or task (e.g., "Design a system for...")
2. All requirements and constraints
3. All specific aspects to address (architecture, database, API, scalability, etc.)
4. Any follow-up questions or areas of particular interest

Return the complete question text exactly as presented, without any additional commentary or explanation."""

def get_design_solution_prompt(question: str) -> str:
    """Returns the prompt for getting system design solutions from Gemini"""
    return f"""
Given the following front end system design question:
{question}

Please provide a comprehensive solution that includes:
1. High-level architecture diagram description
2. Key components and their responsibilities
3. Data flow and interactions between components
4. Database schema if applicable
5. API specifications if applicable
6. Scalability considerations
7. Potential bottlenecks and mitigation strategies

Return the response as a JSON object with the following structure:
{{
    "overview": "High-level description of the system",
    "architecture": "Text description of the architecture diagram",
    "components": [
        {{
            "name": "Component name",
            "description": "Component purpose and responsibilities",
            "interactions": "How it interacts with other components"
        }}
    ],
    "data_flow": "Description of how data moves through the system",
    "database": {{
        "schema": "Database schema description",
        "technology": "Recommended database technology",
        "considerations": "Scaling and performance considerations"
    }},
    "apis": [
        {{
            "endpoint": "API endpoint",
            "method": "HTTP method",
            "description": "Purpose and functionality",
            "request": "Request format",
            "response": "Response format"
        }}
    ],
    "scalability": "Scalability strategies and considerations",
    "bottlenecks": "Potential bottlenecks and mitigation strategies"
}}
"""

def get_react_question_extraction_prompt() -> str:
    """Returns the prompt for extracting React-specific questions from screenshots"""
    return """Extract the complete React-related coding question from this screenshot. Make sure to include:
1. The main question or task
2. All requirements and constraints
3. Any specific React concepts, hooks, or patterns mentioned
4. Any code snippets or examples provided
5. File and folder hierarchy if exists


Return the complete question text exactly as presented, without any additional commentary or explanation and file folder structure with same hierarchy"""

def get_react_solution_prompt(question: str) -> str:
    """Returns the prompt for getting React-specific coding solutions from Gemini"""
    return f"""
Act as an expert React developer specializing in modern TypeScript practices.
Your task is to provide *only* the code solution for the following React problem:

{question}

Follow these instructions rigorously:

1.  **Code Only:** Your entire response must consist *only* of the code implementation. Do **NOT** include any introductory sentences, explanations outside of code comments, closing remarks, or any other text. Start directly with the first line of code.
2.  **TypeScript & State-of-the-Art React:**
    *   Use TypeScript (`.tsx` syntax). Ensure strong typing for props, state, event handlers, and function return types. Use interfaces or types where appropriate.
    *   Employ modern React practices: Functional components, Hooks (useState, useEffect, useCallback, useMemo, useContext, useRef as needed), and potentially custom hooks for reusable logic. Avoid class components.
    *   Focus on clarity, maintainability, and common React patterns.
3.  **Explanatory Comments:** Include concise comments *directly within* the code (typically immediately above the relevant line or block) explaining the *'why'* behind significant implementation choices.
    *   **Purpose:** Explain the reason for using a specific hook, the logic within a function, the structure of state, or the role of a component/prop.
    *   **Focus:** Clarity on design decisions, not just restating what the code does.
    *   **Example:**
        ```typescript
        // Using useCallback to memoize the fetch function, preventing unnecessary re-creation
        // on each render, which optimizes child components that might receive it as a prop.
        const fetchData = useCallback(async () => {{
          // ... fetch logic
        }}, [dependency]);

        // useState to manage the loading state during asynchronous operations.
        const [isLoading, setIsLoading] = useState<boolean>(false);
        ```
4.  **Completeness:** Provide all necessary code snippets (components, types/interfaces, helper functions) required for a functional solution based *only* on the input question. Assume a standard React + TypeScript project setup. Do not add imports for libraries not implicitly needed by the solution (like `React`, `useState` are fine, but don't add `lodash` unless the problem requires it).

Your output should be ready to be copied and pasted directly into `.tsx` files.    
"""

def get_react_solution_prompt_for_claude(question: str) -> str:
    """Returns the prompt for getting React-specific coding solutions from Claude, requesting only code."""
    return f"""
I need a solution to the following React coding problem:

{question}

Please provide ONLY the code implementation in React (TypeScript/TSX) with proper JSX syntax and typescript types. Do not include any explanation, complexity analysis, or strategy tips outside of the code comments.
If you see a file hiearchy in the question explain how you would structure the code shortly in a comment

Code Requirements:
   - IMPORTANT: Include detailed comments ABOVE each code section explaining WHY this code is written this way.
   - IMPORTANT: Do not typescript generic types
   - IMPORTANT: if you see a file hierarchy in the question add file name as commnet and show the code for file below the comment
   - Example of correct comment formatting:
     // This useState hook is used to track form state because we need to maintain input values between renders
     const [formData, setFormData] = useState({{}}); 
   - Make sure to explain your implementation decisions in the comments.

Return ONLY the raw code block, without any surrounding text or markdown formatting (like ```tsx ... ```).
"""

def get_followup_solution_prompt(current_problem: str, current_code: str, transcript: str) -> str:
    """Returns the prompt for getting follow-up solutions from Gemini"""
    return f"""
Given the following context:
1. Current Problem: {current_problem}
2. Current Solution Code: {current_code}
3. Recent Transcript: {transcript}

Please:
1. Extract the most recent follow-up question or request from the transcript
2. Analyze how this follow-up relates to the current solution
3. Modify the current solution code to address the follow-up
4. Return a JSON object with:
   - explanation: Detailed technical explanation of the changes made
   - solution: Friendly and conversational but concise explanation as if you're in an interview explaining your approach
   - code: The updated solution code
"""

def get_react_followup_solution_prompt_for_gemini(transcript: str, react_question: str, current_solution: str) -> str:
    """Returns the prompt for getting raw React follow-up solutions from Gemini."""
    return f"""
Given the following context:
1. Original React Question: {react_question}
2. Current React Solution Code:
```tsx
{current_solution}
```
3. Recent Transcript:
```
{transcript}
```

Please perform the following steps:
IF the follow-up requires CODE CHANGES:
- Modify the "Current Code" to address ONLY the follow-up.
- Add comments ONLY for the changes explaining the 'why'.
- Output ONLY the raw, complete, updated TSX code. No other text.
ELSE IF the follow-up is a QUESTION (not requiring code changes):
- State the identified question.
- Provide a concise answer.
- Append the original, unmodified "Current Code" block below the answer.
"""

def get_transcript_question_extraction_prompt() -> str:
    """Returns the prompt for extracting the latest question from a transcript"""
    return """Analyze the following interview transcript and extract the most recent, complete question or task description given by the interviewer.

Instructions:
1. Analyze the entire transcript provided below.
2. Identify ONLY the **latest** (most recent) question or task description given by the interviewer. Pay attention to conversational cues that indicate a new question is being asked.
3. Once the latest question/task is identified, extract its core request (e.g., "solve this coding problem", "design this system", "explain this concept").
4. Extract ALL associated requirements, constraints, context, and specific details mentioned immediately before, during, or after that *specific* latest question/task that are necessary to understand its full scope.
5. Combine the core request and all its associated details into a single, coherent block of text representing the complete latest question/task.
6. Ignore conversational filler, greetings, earlier questions, and unrelated side comments.
7. Focus on technical questions, coding problems, system design tasks, or behavioral questions that require a structured answer.

Return only the complete, extracted text for the **latest** question/task description, without any introductory phrases like "The question is:", commentary, or explanation."""

def get_transcript_system_design_question_extraction_prompt() -> str:
    """Returns the prompt for extracting the system design question from a transcript"""
    return """Analyze the interview transcript and extract the complete system design question.
Instructions:
1. Identify the system design question in the transcript.
2. Extract the core design task along with ALL requirements, constraints, and specific details mentioned that are necessary to understand the full scope.
3. Include any scale requirements, performance expectations, or technical constraints.
4. Combine all related information into a single, coherent block of text.
5. Ignore conversational filler, greetings, and unrelated comments.
Return only the extracted system design question with its complete details, without any introductory phrases or commentary."""

def get_frontend_system_design_extraction_prompt_with_details() -> str:
    """
    Returns the prompt for extracting a frontend system design question from a transcript,
    along with TypeScript entities and API endpoint definitions.
    The response should be structured according to the provided schema.
    """
    return """Analyze the interview transcript and extract the most recent complete frontend system design question.

Instructions:
1. Identify the core frontend system design question or task in the transcript.
2. Extract ALL associated requirements, constraints, and specific details mentioned that are necessary to understand its full scope.
3. Based on the extracted question, define relevant data entities using TypeScript interfaces or types.
4. Define key REST API endpoints that the frontend system might interact with. For each endpoint, specify:
    - HTTP method (e.g., GET, POST, PUT, DELETE)
    - Path (e.g., /users, /items/{id})
    - A brief description of its purpose
    - Example request payload (if applicable, in JSON format)
    - Example response payload (in JSON format)
5. Ignore conversational filler, greetings, earlier questions, and unrelated side comments.

Provide the information structured as follows:
- "question": The complete extracted frontend system design question, including all requirements and details.
- "entities": A string containing TypeScript interface/type definitions for relevant data entities. Each definition should be on a new line. Example:\\ninterface User {\\n  id: string;\\n  name: string;\\n}\\ninterface Product {\\n  productId: string;\\n  productName: string;\\n}
- "api": A string describing the REST API endpoints. Each endpoint definition should be clearly delineated. Example:\\nGET /api/users/{userId}\\nPurpose: Retrieve user.\\nResponse: { 'id': '123', 'name': 'John' }\\nPOST /api/orders\\nPurpose: Create order.\\nRequest: { 'userId': '123', 'items': [] }\\nResponse: { 'orderId': 'abc' }
"""
