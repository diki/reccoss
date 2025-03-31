from .common import genai, configure_gemini, json
from typing import Dict, Optional

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
        
        # Construct the prompt for Gemini
        prompt = f"""
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
