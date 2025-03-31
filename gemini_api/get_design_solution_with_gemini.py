from .common import genai, configure_gemini, json
from typing import Dict, Optional

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
        prompt = f"""
Given the following front end system design question:
{question}

Please provide a comprehensive solution that includes:
1. High-level architecture diagram description
2. Key components and their responsibilities
3. Data flow and interactions between components
4. Database schema if applicable
5. API specifications if applicable
6. Scalability considerations
7. Potential bottlenecks and mitigation strategies

Return the response as a JSON object with the following structure:
{{
    "overview": "High-level description of the system",
    "architecture": "Text description of the architecture diagram",
    "components": [
        {{
            "name": "Component name",
            "description": "Component purpose and responsibilities",
            "interactions": "How it interacts with other components"
        }}
    ],
    "data_flow": "Description of how data moves through the system",
    "database": {{
        "schema": "Database schema description",
        "technology": "Recommended database technology",
        "considerations": "Scaling and performance considerations"
    }},
    "apis": [
        {{
            "endpoint": "API endpoint",
            "method": "HTTP method",
            "description": "Purpose and functionality",
            "request": "Request format",
            "response": "Response format"
        }}
    ],
    "scalability": "Scalability strategies and considerations",
    "bottlenecks": "Potential bottlenecks and mitigation strategies"
}}
"""
        
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
