import os
import base64
import requests
import json
from typing import Optional, Dict
import google.generativeai as genai

def encode_image_to_base64(image_path: str) -> str:
    """
    Encode an image file to base64 string
    
    Parameters:
    - image_path: Path to the image file
    
    Returns:
    - Base64 encoded string of the image
    """
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_coding_question_with_gemini(image_path: str) -> Optional[str]:
    """
    Send an image to Google Gemini API to extract a coding question
    
    Parameters:
    - image_path: Path to the screenshot image
    
    Returns:
    - Extracted coding question as a string, or None if extraction failed
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return None
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    try:
        # Load the image
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
        
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create a prompt with the image
        response = model.generate_content([
            "Extract the coding question from this screenshot. Return only the question text without any additional commentary or explanation.",
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

def get_solution_for_question_with_gemini(question: str) -> Optional[Dict[str, str]]:
    """
    Send a coding question to Google Gemini API to get a solution
    
    Parameters:
    - question: The coding question to solve
    
    Returns:
    - Dictionary containing explanation, code, and complexity, or None if failed
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return None
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    # Construct the prompt for Gemini
    prompt = f"""
I need a solution to the following coding problem:

{question}

Please provide a comprehensive solution with the following components:

1. EXPLANATION: Explain your solution step by step in simple English terms. Break down your thought process and approach.

2. CODE: Implement the solution in TypeScript with proper type annotations. Make sure the code is clean, efficient, and well-commented.

3. COMPLEXITY: Analyze the time and space complexity of your solution. Explain why this is the optimal complexity for this problem.

Format your response with clear section headers for each component.
"""
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate the solution
        response = model.generate_content(prompt)
        
        if response and response.text:
            solution_text = response.text
            
            # Parse the solution text to extract the different sections
            explanation = ""
            code = ""
            complexity = ""
            
            # Simple parsing logic - can be improved for more robust extraction
            current_section = None
            for line in solution_text.split('\n'):
                line_lower = line.lower()
                
                if "explanation" in line_lower and (line_lower.startswith('#') or line_lower.startswith('1.')):
                    current_section = "explanation"
                    continue
                elif "code" in line_lower and (line_lower.startswith('#') or line_lower.startswith('2.')):
                    current_section = "code"
                    continue
                elif "complexity" in line_lower and (line_lower.startswith('#') or line_lower.startswith('3.')):
                    current_section = "complexity"
                    continue
                
                if current_section == "explanation":
                    explanation += line + "\n"
                elif current_section == "code":
                    code += line + "\n"
                elif current_section == "complexity":
                    complexity += line + "\n"
            
            # If the parsing logic failed, just return the full text as explanation
            if not explanation and not code and not complexity:
                explanation = solution_text
            
            return {
                "explanation": explanation.strip(),
                "code": code.strip(),
                "complexity": complexity.strip()
            }
        else:
            print("Empty response from Gemini API")
            return None
    
    except Exception as e:
        print(f"Exception when calling Gemini API for solution: {str(e)}")
        return None
