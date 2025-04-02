import os
import base64
import requests
import json
from typing import Optional, Dict
from openai import OpenAI

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

def extract_coding_question_with_openai(image_path: str) -> Optional[str]:
    """
    Send an image to OpenAI API to extract a coding question
    
    Parameters:
    - image_path: Path to the screenshot image
    
    Returns:
    - Extracted coding question as a string, or None if extraction failed
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return None
    
    # Initialize the OpenAI client
    client = OpenAI(api_key=api_key)
    
    try:
        # Load the image
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
        
        # Create a prompt with the image
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract the coding question from this screenshot. Return only the question text without any additional commentary or explanation."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{encode_image_to_base64(image_path)}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        # Extract the question from OpenAI's response
        if response and response.choices and len(response.choices) > 0:
            extracted_question = response.choices[0].message.content
            return extracted_question.strip()
        else:
            print("Empty response from OpenAI API")
            return None
    
    except Exception as e:
        print(f"Exception when calling OpenAI API: {str(e)}")
        return None

def get_solution_for_question_with_openai(question: str) -> Optional[Dict[str, str]]:
    """
    Send a coding question to OpenAI API to get a solution
    
    Parameters:
    - question: The coding question to solve
    
    Returns:
    - Dictionary containing explanation, code, complexity, and strategy, or None if failed
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return None
    
    # Initialize the OpenAI client
    client = OpenAI(api_key=api_key)
    
    # Construct the prompt for OpenAI
    prompt = f"""
I need a solution to the following coding problem:

{question}

Please provide a comprehensive solution with the following components:

1. EXPLANATION: Explain your solution step by step in simple English terms. Break down your thought process and approach.

2. CODE: Implement the solution in TypeScript with proper type annotations. Make sure the code is clean, efficient, and well-commented.

3. COMPLEXITY: Analyze the time and space complexity of your solution. Explain why this is the optimal complexity for this problem.

4. STRATEGY: Imagine you are in an interview for a staff front-end engineering position for a big/good company. In the interview, you have been asked this question. The thing is you know the algorithm already, but your job is to spend half an hour with back and forth with the interviewer with this question. You don't want to directly write the answer. Define a strategy for approaching this problem in an interview setting, including what clarifying questions you would ask, how you would think through the problem out loud, and how you would incrementally develop your solution. On any step of the strategy where you need to write code, show the full accumulated code that should be written at that point, not just the new parts. Each subsequent code example should build upon the previous ones, showing the complete solution as it evolves.

Format your response with clear section headers for each component.
"""
    
    try:
        # Generate the solution
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000
        )
        
        if response and response.choices and len(response.choices) > 0:
            solution_text = response.choices[0].message.content
            
            # Parse the solution text to extract the different sections
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
            print("Empty response from OpenAI API")
            return None
    
    except Exception as e:
        print(f"Exception when calling OpenAI API for solution: {str(e)}")
        return None

def extract_react_question_with_openai(image_path: str) -> Optional[str]:
    """
    Send an image to OpenAI API to extract a React-specific question

    Parameters:
    - image_path: Path to the screenshot image

    Returns:
    - Extracted React question as a string, or None if extraction failed
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return None

    # Initialize the OpenAI client
    client = OpenAI(api_key=api_key)

    # Simplified prompt for OpenAI React question extraction
    prompt_text = """Extract the React coding question shown in this image. Return only the question text."""

    try:
        # Encode the image
        base64_image = encode_image_to_base64(image_path)

        # Create a prompt with the image
        response = client.chat.completions.create(
            model="gpt-4o-mini", # Using gpt-4o-mini as in other functions
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt_text
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000 # Allow sufficient tokens for potentially long questions
        )

        # Extract the question from OpenAI's response
        if response and response.choices and len(response.choices) > 0:
            extracted_question = response.choices[0].message.content
            return extracted_question.strip()
        else:
            print("Empty response from OpenAI API for React question extraction")
            return None

    except Exception as e:
        print(f"Exception when calling OpenAI API for React question extraction: {str(e)}")
        return None
