import os
import json
from typing import Dict, Optional
import google.generativeai as genai
from .prompts import get_solution_prompt

def get_solution_for_question_with_gemini(question: str) -> Optional[Dict[str, str]]:
    """
    Send a coding question to Google Gemini API to get a solution using structured JSON output
    
    Parameters:
    - question: The coding question to solve
    
    Returns:
    - Dictionary containing explanation, code, complexity, and strategy, or None if failed
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return None
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Get the prompt from prompts.py
        prompt = get_solution_prompt(question)
        
        # Define the response schema for structured output
        response_schema = {
            "type": "object",
            "properties": {
                "explanation": {
                    "type": "string",
                    "description": "Step-by-step technical explanation of the solution approach"
                },
                "solution": {
                    "type": "string",
                    "description": "Friendly and conversational but concise explanation as if in an interview setting"
                },
                "code": {
                    "type": "string",
                    "description": "TypeScript implementation of the solution with proper type annotations"
                },
                "complexity": {
                    "type": "string",
                    "description": "Analysis of time and space complexity"
                },
                "strategy": {
                    "type": "string",
                    "description": "Interview strategy tips for this problem"
                }
            },
            "required": ["explanation", "solution", "code", "complexity", "strategy"]
        }
        
        # Generate the solution with structured JSON output
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": response_schema
            }
        )
        
        if response and response.text:
            try:
                # Parse the JSON response
                solution = json.loads(response.text)
                return {
                    "explanation": solution.get("explanation", ""),
                    "solution": solution.get("solution", ""),
                    "code": solution.get("code", ""),
                    "complexity": solution.get("complexity", ""),
                    "strategy": solution.get("strategy", "")
                }
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON response: {str(e)}")
                # Fallback to the old text parsing method if JSON parsing fails
                solution_text = response.text
                
                # Try to extract JSON from the text if it's embedded
                if "{" in solution_text and "}" in solution_text:
                    try:
                        json_start = solution_text.find("{")
                        json_end = solution_text.rfind("}") + 1
                        json_str = solution_text[json_start:json_end]
                        solution = json.loads(json_str)
                        return {
                            "explanation": solution.get("explanation", ""),
                            "solution": solution.get("solution", ""),
                            "code": solution.get("code", ""),
                            "complexity": solution.get("complexity", ""),
                            "strategy": solution.get("strategy", "")
                        }
                    except:
                        pass
                
                # If all JSON parsing fails, return the raw text as explanation
                return {
                    "explanation": solution_text,
                    "solution": "I'd approach this by carefully analyzing the requirements and implementing a solution that addresses the core issue while maintaining good coding practices.",
                    "code": "",
                    "complexity": "",
                    "strategy": ""
                }
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for solution: {str(e)}")
        return None
