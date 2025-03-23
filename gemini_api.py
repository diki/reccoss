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
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return None
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
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
        
        # Construct the prompt for Gemini
        prompt = f"""
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
