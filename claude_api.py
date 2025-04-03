import os
import base64
import requests
import json
from typing import Optional, Dict

# Import the specific prompt function needed for Claude React solutions
from gemini_api.prompts import get_react_solution_prompt_for_claude

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
    return _get_solution_with_prompt(question, _create_solution_prompt)

def get_followup_solution(current_problem: str, current_code: str, transcript: str) -> Optional[Dict[str, str]]:
    """
    Send a follow-up request to Claude Sonnet API to get an updated solution
    
    Parameters:
    - current_problem: The original coding problem
    - current_code: The current solution code
    - transcript: Recent transcript text containing the follow-up question
    
    Returns:
    - Dictionary containing explanation and updated code, or None if failed
    """
    return _get_solution_with_prompt(
        {"problem": current_problem, "code": current_code, "transcript": transcript},
        _create_followup_prompt
    )

def get_react_solution(question: str) -> Optional[Dict[str, str]]:
    """
    Send a React-specific coding question to Claude Sonnet API to get a solution
    
    Parameters:
    - question: The React coding question to solve
    
    Returns:
    - Dictionary containing only the 'code' field populated, or None if failed
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

    # Construct the prompt for Claude using the specific React prompt creator
    prompt = get_react_solution_prompt_for_claude(question)

    # Construct the message
    payload = {
        # "model": "claude-3-7-sonnet-20250219",
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 4000, # Keep max tokens high for potentially long code
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    print("Get React solution code with Claude");
    # print(payload) # Avoid printing potentially large prompts

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
            code_text = response_data["content"][0]["text"]
            
            print("React code solution is ready")
            # print(code_text) # Avoid printing potentially large code blocks

            # Return the response in the expected dictionary format, only populating 'code'
            return {
                "explanation": "", 
                "solution": "", # Corresponds to interview_explanation in frontend
                "code": code_text.strip(), 
                "complexity": "", 
                "strategy": ""
            }
        else:
            print(f"Error from Claude API: {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"Exception when calling Claude API for React code solution: {str(e)}")
        return None

def get_followup_solution_with_claude_react(transcript: str, react_question: str, current_solution: str) -> Optional[str]:
    """
    Send transcript, react question, and current solution to Claude to get a follow-up answer.
    Returns the raw text response.

    Parameters:
    - transcript: Recent transcript text.
    - react_question: The current React question being discussed.
    - current_solution: The current solution code (React or standard).

    Returns:
    - Raw text response from Claude, or None if failed.
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

    # Construct the specific prompt
    prompt = f"""Here is the recent transcript of an interview discussion:
<transcript>
{transcript}
</transcript>

Here is the current React question being discussed:
<react_question>
{react_question}
</react_question>

Here is the current code solution provided so far:
<current_solution>
{current_solution}
</current_solution>

Based *only* on the information in the transcript, please perform the following steps:
1. Identify and extract the most recent meaningful statement or question from the interviewer in the transcript. This could be a question, instruction, feedback, or any other important input.
2. Provide a suggested response to that extracted input, write down suggested response step by step
3. If responding requires a change to the provided <current_solution> code, include the necessary code modifications or additions in your answer. If no code change is needed, state that explicitly.

Your response MUST start with the extracted input on its own line, like this:
Extracted Input: [The exact statement or question you extracted from the transcript]

Then, provide your suggested response below that line. Do not include any other introductory text or commentary. Return only the extracted input line and the suggested response.
"""

    # Construct the message payload
    payload = {
        # "model": "claude-3-7-sonnet-20250219",
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 2000, # Adjust as needed
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    print("Sending request to Claude for React follow-up solution...")
    # print(f"Prompt: {prompt}") # Avoid printing potentially large prompts/solutions

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
            raw_response_text = response_data["content"][0]["text"]
            print("Claude React follow-up response received.")
            # print(f"Raw Response: {raw_response_text}") # Avoid printing potentially large responses
            return raw_response_text.strip() # Return the raw text
        else:
            print(f"Error from Claude API (React Followup): {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"Exception when calling Claude API for React follow-up solution: {str(e)}")
        return None


def _create_followup_prompt(context: Dict[str, str]) -> str:
    """
    Create a prompt for follow-up solution
    
    Parameters:
    - context: Dictionary containing problem, code, and transcript
    
    Returns:
    - Formatted prompt string
    """
    return f"""
Given the following context:
1. Current Problem: {context['problem']}
2. Current Solution Code: {context['code']}
3. Recent Transcript: {context['transcript']}

Please:
1. Extract the most recent follow-up question or request from the transcript
2. Analyze how this follow-up relates to the current solution
3. Modify the current solution code to address the follow-up
4. Return a JSON object with:
   - explanation: Detailed explanation of the changes made
   - code: The updated solution code

IMPORTANT: Format your response as a valid JSON object with the following structure:
{{
  "explanation": "Your detailed explanation here",
  "code": "Your updated TypeScript code here"
}}

Make sure to properly escape any special characters in the JSON strings, especially quotes and newlines.
"""

def _create_solution_prompt(question: str) -> str:
    """
    Create a prompt for initial solution
    
    Parameters:
    - question: The coding question to solve
    
    Returns:
    - Formatted prompt string
    """
    return f"""
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

def _get_solution_with_prompt(context, prompt_creator) -> Optional[Dict[str, str]]:
    """
    Generic function to get a solution from Claude API
    
    Parameters:
    - context: The context for the prompt (string or dict)
    - prompt_creator: Function to create the prompt
    
    Returns:
    - Dictionary containing solution components, or None if failed
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
    prompt = prompt_creator(context)
    
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
    
    print("Get solution with Claude");
    print(payload)
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
            
            print("solution is ready")
            print(solution_text)

            try:
                # Try to parse the response as JSON
                # Find the first { and the last } to extract the JSON object
                start_idx = solution_text.find('{')
                end_idx = solution_text.rfind('}') + 1
                
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = solution_text[start_idx:end_idx]
                    solution_json = json.loads(json_str)
                    
                    # Return all keys found in the parsed JSON object
                    # This makes the function more flexible for different prompt structures
                    return {k: solution_json.get(k, "") for k in solution_json}
                    
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

                # Fallback: Return the full text as explanation if parsing fails completely
                # Determine expected keys based on the prompt creator function name if possible,
                # otherwise return a generic structure or just the explanation.
                # For simplicity here, we'll return a basic structure if parsing failed.
                # A more robust implementation might try to infer keys based on context.
                fallback_result = {"explanation": explanation.strip()}
                if "code" in locals() and code.strip(): fallback_result["code"] = code.strip()
                if "complexity" in locals() and complexity.strip(): fallback_result["complexity"] = complexity.strip()
                if "strategy" in locals() and strategy.strip(): fallback_result["strategy"] = strategy.strip()
                # Add 'solution' key if it's likely a React prompt (simple check)
                if prompt_creator.__name__ == 'get_react_solution_prompt':
                     fallback_result["solution"] = "" # Add placeholder if needed

                return fallback_result

        else:
            print(f"Error from Claude API: {response.status_code}")
            print(response.text)
            return None
    
    except Exception as e:
        print(f"Exception when calling Claude API for solution: {str(e)}")
        return None
