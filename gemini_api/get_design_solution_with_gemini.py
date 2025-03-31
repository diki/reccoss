from .common import genai, configure_gemini, json
from typing import Dict, Optional
from .prompts import get_design_solution_prompt

def get_design_solution_with_gemini(question: str) -> Optional[Dict[str, str]]:
    """
    Send a system design question to Google Gemini API to get a solution
    
    Parameters:
    - question: The system design question
    
    Returns:
    - Dictionary containing components and explanations, or None if failed
    """
    if not configure_gemini():
        return None
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Construct the prompt for Gemini
        prompt = get_design_solution_prompt(question)
        
        # Generate the solution with structured JSON output
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
        if response and response.text:
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                # Fallback to returning the raw text if JSON parsing fails
                return {"raw_response": response.text}
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for design solution: {str(e)}")
        return None
