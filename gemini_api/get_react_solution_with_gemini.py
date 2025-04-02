import os
import json
from typing import Dict, Optional
import google.generativeai as genai
from .prompts import get_react_solution_prompt
from .common import configure_gemini

def get_react_solution_with_gemini(question: str) -> Optional[Dict[str, str]]:
    """
    Send a React-specific coding question to Google Gemini API to get a solution using structured JSON output
    
    Parameters:
    - question: The React coding question to solve
    
    Returns:
    - Dictionary containing explanation, code, complexity, and strategy, or None if failed
    """
    if not configure_gemini():
        return None
    
        
    print("get react solution");
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.5-pro-exp-03-25')
        
        # Get the prompt from prompts.py
        prompt = get_react_solution_prompt(question)
        
        # Define the response schema for structured output
        response_schema = {
            "type": "object",
            "properties": {
                "explanation": {
                    "type": "string",
                    "description": "Step-by-step technical explanation of the React solution approach"
                },
                "solution": {
                    "type": "string",
                    "description": "Friendly and conversational but concise explanation as if in an interview setting"
                },
                "code": {
                    "type": "string",
                    "description": "React implementation of the solution with proper JSX and comments explaining the code"
                },
                "complexity": {
                    "type": "string",
                    "description": "Analysis of time and space complexity, including React-specific performance considerations"
                },
                "strategy": {
                    "type": "string",
                    "description": "Interview strategy tips for this React problem"
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
                print(response.text);
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
                    "solution": "I'd approach this React problem by carefully analyzing the requirements and implementing a solution that addresses the core issue while maintaining React best practices.",
                    "code": "",
                    "complexity": "",
                    "strategy": ""
                }
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for React solution: {str(e)}")
        return None

def get_react_solution2_with_gemini(question: str) -> Optional[Dict[str, str]]:
    """
    Send a React-specific coding question to Google Gemini API using Claude's prompt format
    
    Parameters:
    - question: The React coding question to solve
    
    Returns:
    - Dictionary containing only the 'code' field populated, or None if failed
    """
    if not configure_gemini():
        return None
    
    print("Get React solution2 with Gemini (using Claude's prompt)")
    
    try:
        # Initialize the model
        # Using a potentially newer or experimental model if available, adjust as needed
        model = genai.GenerativeModel('gemini-1.5-pro-latest') 
        
        # Get the Claude prompt from prompts.py
        # Make sure get_react_solution_prompt_for_claude is imported or defined
        from .prompts import get_react_solution_prompt_for_claude 
        prompt = get_react_solution_prompt_for_claude(question)
        
        # Generate the solution - Note: Gemini might not strictly adhere to "only code"
        # We might need to adjust the prompt or post-process the response if Gemini adds extra text
        response = model.generate_content(prompt)
        
        if response and response.text:
            code_text = response.text
            
            print("React code solution2 is ready")
            
            # Return the response in the expected dictionary format, only populating 'code'
            # We assume the response is mostly code, but might need cleaning
            return {
                "explanation": "", 
                "solution": "", # Corresponds to interview_explanation in frontend
                "code": code_text.strip(), # Basic stripping, might need more robust cleaning
                "complexity": "", 
                "strategy": ""
            }
        else:
            print("Empty response from Gemini API for solution2")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for React solution2: {str(e)}")
        return None
