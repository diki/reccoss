import os
import base64
import requests
import json
from typing import Optional, Dict

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

def extract_coding_question(image_path: str) -> Optional[str]:
    """
    Send an image to Claude Sonnet API to extract a coding question
    
    Parameters:
    - image_path: Path to the screenshot image
    
    Returns:
    - Extracted coding question as a string, or None if extraction failed
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        return None
    
    # Encode the image to base64
    base64_image = encode_image_to_base64(image_path)
    
    # Prepare the API request
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    # Construct the message with the image
    payload = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 1000,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": "Extract the coding question from this screenshot. Return only the question text without any additional commentary or explanation."
                    }
                ]
            }
        ]
    }
    
    try:
        # Make the API request
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            response_data = response.json()
            # Extract the question from Claude's response
            extracted_question = response_data["content"][0]["text"]
            return extracted_question.strip()
        else:
            print(f"Error from Claude API: {response.status_code}")
            print(response.text)
            return None
    
    except Exception as e:
        print(f"Exception when calling Claude API: {str(e)}")
        return None

def get_solution_for_question(question: str) -> Optional[Dict[str, str]]:
    """
    Send a coding question to Claude Sonnet API to get a solution
    
    Parameters:
    - question: The coding question to solve
    
    Returns:
    - Dictionary containing explanation, code, complexity, and strategy, or None if failed
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        return None
    
    # Prepare the API request
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    # Construct the prompt for Claude
    prompt = f"""
I need a solution to the following coding problem:

{question}

Please provide a comprehensive solution with the following components:

1. EXPLANATION: Explain your solution step by step in simple English terms. Break down your thought process and approach.

2. CODE: Implement the solution in TypeScript with proper type annotations. Make sure the code is clean, efficient, and well-commented.

3. COMPLEXITY: Analyze the time and space complexity of your solution. Explain why this is the optimal complexity for this problem.

4. STRATEGY: Imagine you are in an interview for a staff front-end engineering position for a big/good company. In the interview, you have been asked this question. The thing is you know the algorithm already, but your job is to spend half an hour with back and forth with the interviewer with this question. You don't want to directly write the answer. Define a strategy for approaching this problem in an interview setting, including what clarifying questions you would ask, how you would think through the problem out loud, and how you would incrementally develop your solution. On any step of the strategy where you need to write code, show the full accumulated code that should be written at that point, not just the new parts. Each subsequent code example should build upon the previous ones, showing the complete solution as it evolves.

IMPORTANT: Format your response as a valid JSON object with the following structure:
{{
  "explanation": "Your detailed explanation here",
  "code": "Your TypeScript code here",
  "complexity": "Your complexity analysis here",
  "strategy": "Your interview strategy here"
}}

Make sure to properly escape any special characters in the JSON strings, especially quotes and newlines.
"""
    
    # Construct the message
    payload = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 4000,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    try:
        # Make the API request
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            response_data = response.json()
            solution_text = response_data["content"][0]["text"]
            
            try:
                # Try to parse the response as JSON
                # Find the first { and the last } to extract the JSON object
                start_idx = solution_text.find('{')
                end_idx = solution_text.rfind('}') + 1
                
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = solution_text[start_idx:end_idx]
                    solution_json = json.loads(json_str)
                    
                    # Ensure all required fields are present
                    return {
                        "explanation": solution_json.get("explanation", ""),
                        "code": solution_json.get("code", ""),
                        "complexity": solution_json.get("complexity", ""),
                        "strategy": solution_json.get("strategy", "")
                    }
                else:
                    raise ValueError("JSON object not found in response")
                    
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Failed to parse JSON response: {str(e)}")
                
                # Fallback to the original text parsing method
                explanation = ""
                code = ""
                complexity = ""
                strategy = ""
                
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
                    elif "strategy" in line_lower and (line_lower.startswith('#') or line_lower.startswith('4.')):
                        current_section = "strategy"
                        continue
                    
                    if current_section == "explanation":
                        explanation += line + "\n"
                    elif current_section == "code":
                        code += line + "\n"
                    elif current_section == "complexity":
                        complexity += line + "\n"
                    elif current_section == "strategy":
                        strategy += line + "\n"
                
                # If the parsing logic failed, just return the full text as explanation
                if not explanation and not code and not complexity and not strategy:
                    explanation = solution_text
                
                return {
                    "explanation": explanation.strip(),
                    "code": code.strip(),
                    "complexity": complexity.strip(),
                    "strategy": strategy.strip()
                }
        else:
            print(f"Error from Claude API: {response.status_code}")
            print(response.text)
            return None
    
    except Exception as e:
        print(f"Exception when calling Claude API for solution: {str(e)}")
        return None
