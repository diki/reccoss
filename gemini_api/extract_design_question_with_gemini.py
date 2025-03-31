from typing import Optional
from .common import genai, configure_gemini

def extract_design_question_with_gemini(image_path: str) -> Optional[str]:
    """
    Send an image to Google Gemini API to extract a system design question
    
    Parameters:
    - image_path: Path to the screenshot image
    
    Returns:
    - Extracted system design question as a string, or None if extraction failed
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
            """Extract the complete system design question from this screenshot. Make sure to include:
1. The main question or task (e.g., "Design a system for...")
2. All requirements and constraints
3. All specific aspects to address (architecture, database, API, scalability, etc.)
4. Any follow-up questions or areas of particular interest

Return the complete question text exactly as presented, without any additional commentary or explanation.""",
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
