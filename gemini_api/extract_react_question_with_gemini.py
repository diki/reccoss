from typing import Optional
from .common import genai, configure_gemini
from .prompts import get_react_question_extraction_prompt


def extract_react_question_with_gemini(image_path: str) -> Optional[str]:
    """
    Send an image to Google Gemini API to extract a React-specific question
    
    Parameters:
    - image_path: Path to the screenshot image
    
    Returns:
    - Extracted React question as a string, or None if extraction failed
    """
    if not configure_gemini():
        return None
    
    try:
        # Load the image
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
        
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create a prompt with the image
        response = model.generate_content([
            get_react_question_extraction_prompt(),
            {"mime_type": "image/png", "data": image_data}
        ])
        
        # Extract the question from Gemini's response
        if response and response.text:
            return response.text.strip()
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API: {str(e)}")
        return None
