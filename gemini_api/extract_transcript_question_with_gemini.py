from typing import Optional
from .prompts import get_transcript_question_extraction_prompt
from .common import genai, configure_gemini # Import correct items

def extract_question_from_transcript_with_gemini(transcript_text: str) -> Optional[str]:
    """
    Uses Gemini to extract the latest question from the provided transcript text.

    Args:
        transcript_text: The full text of the interview transcript.

    Returns:
        The extracted question text as a string, or None if extraction fails.
    """
    # 1. Configure Gemini API Key
    if not configure_gemini():
        return None

    try:
        # 2. Initialize the model (using the same model as design question for now)
        model = genai.GenerativeModel('gemini-2.5-pro-exp-03-25') # Use the correct model name

        print("💬💬💬💬💬💬💬💬💬💬💬")
        print(transcript_text)
        print("💬💬💬💬💬💬💬💬💬💬💬")

        # 3. Get the prompt
        prompt = get_transcript_question_extraction_prompt()

        # Construct the full prompt including the transcript
        # 4. Construct the full prompt including the transcript
        full_prompt = f"{prompt}\n\nTranscript:\n```\n{transcript_text}\n```"

        # 5. Call the Gemini API
        print("Sending request to Gemini to extract question from transcript...")
        response = model.generate_content(full_prompt)

        # 6. Process the response
        if response and response.text:
            extracted_question = response.text.strip()
            print(f"Successfully extracted question from transcript: {extracted_question}")
            return extracted_question
        else:
            print("Gemini did not return a question from the transcript.")
            # Check for potential safety blocks or other issues
            try:
                print(f"Gemini response parts: {response.parts}")
                if response.prompt_feedback:
                    print(f"Gemini prompt feedback: {response.prompt_feedback}")
            except Exception:
                pass # Ignore errors if response structure is unexpected
            return None

    except Exception as e:
        print(f"Error extracting question from transcript with Gemini: {e}")
        return None

if __name__ == '__main__':
    # Example usage (replace with actual transcript)
    sample_transcript = """
Interviewer: Okay, thanks for walking me through that. So, let's switch gears a bit. Can you tell me about a time you had to handle conflicting requirements?
Interviewee: Sure, there was this one project...
Interviewer: Interesting. Now, for the next task, I'd like you to design a simple API for a URL shortener service. Think about the core endpoints, data model, and how you'd handle potential collisions.
Interviewee: Okay, so for a URL shortener...
"""
    extracted_question = extract_question_from_transcript_with_gemini(sample_transcript)
    if extracted_question:
        print("\n--- Extracted Question ---")
        print(extracted_question)
    else:
        print("\n--- Failed to extract question ---")
