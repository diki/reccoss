import os
import base64
import requests
import json
from typing import Optional, Dict
import google.generativeai as genai

def configure_gemini() -> bool:
    """
    Configure Gemini API with environment variable
    
    Returns:
    - True if configured successfully, False otherwise
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return False
    
    genai.configure(api_key=api_key)
    return True
