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
