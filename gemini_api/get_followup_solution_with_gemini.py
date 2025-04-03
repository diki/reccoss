from .common import genai, configure_gemini, json
from .prompts import get_followup_solution_prompt, get_react_followup_solution_prompt_for_gemini # Added new prompt import
from typing import Dict, Optional, Union

def get_followup_solution_with_gemini(current_problem: str, current_code: str, transcript: str) -> Optional[Dict[str, str]]:
    """
    Send a follow-up request to Google Gemini API to get an updated solution
    
    Parameters:
    - current_problem: The original coding problem
    - current_code: The current solution code
    - transcript: Recent transcript text containing the follow-up question
    
    Returns:
    - Dictionary containing explanation and updated code, or None if failed
    """
    if not configure_gemini():
        return None
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Get the prompt from prompts.py
        prompt = get_followup_solution_prompt(current_problem, current_code, transcript)
        
        # Define the response schema for structured output
        response_schema = {
            "type": "object",
            "properties": {
                "explanation": {
                    "type": "string",
                    "description": "Detailed technical explanation of the changes made to address the follow-up"
                },
                "solution": {
                    "type": "string",
                    "description": "Friendly and conversational but concise explanation as if in an interview setting"
                },
                "code": {
                    "type": "string",
                    "description": "The updated solution code"
                }
            },
            "required": ["explanation", "solution", "code"]
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
                    "code": solution.get("code", "")
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
                            "code": solution.get("code", "")
                        }
                    except:
                        pass
                
                # If all JSON parsing fails, return the raw text as explanation
                return {
                    "explanation": solution_text,
                    "solution": "I'd approach this by carefully analyzing the requirements and implementing a solution that addresses the core issue while maintaining good coding practices.",
                    "code": ""
                }
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for follow-up solution: {str(e)}")
        return None


def get_react_followup_solution_with_gemini(transcript: str, react_question: str, current_solution: str) -> Optional[str]:
    """
    Send a React follow-up request to Google Gemini API to get raw updated code.

    Parameters:
    - transcript: Recent transcript text containing the follow-up question.
    - react_question: The original React coding question.
    - current_solution: The current React solution code.

    Returns:
    - Raw updated code string, or None if failed.
    """
    if not configure_gemini():
        print("Gemini API key not configured.")
        return None

    try:
        # Use a model suitable for code generation/modification, e.g., gemini-1.5-flash or gemini-pro
        # Note: The original code used 'gemini-2.0-flash' which might be incorrect. Using 'gemini-1.5-flash'.
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Get the specific prompt for raw React follow-up
        prompt = get_react_followup_solution_prompt_for_gemini(transcript, react_question, current_solution)

        # Generate the content (expecting raw text based on the prompt)
        response = model.generate_content(prompt)

        if response and response.text:
            # Return the raw text directly as requested by the prompt
            print("Successfully received raw React follow-up from Gemini.")
            return response.text
        else:
            print("Empty response from Gemini API for React follow-up.")
            # Check for safety ratings or other reasons for empty response
            if response and response.prompt_feedback:
                 print(f"Prompt Feedback: {response.prompt_feedback}")
            if response and response.candidates and response.candidates[0].finish_reason:
                 print(f"Finish Reason: {response.candidates[0].finish_reason}")
            return None

    except Exception as e:
        print(f"Exception when calling Gemini API for React follow-up solution: {str(e)}")
        return None
