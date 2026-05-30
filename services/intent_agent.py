import json
import re
from services.gemini_service import GeminiService

class IntentAgent:
    @staticmethod
    def extract(prompt: str) -> dict:
        system_prompt = f"""You are the Intent Extraction Agent inside a software compiler.
Analyze the user's natural language request and extract the core intent parameters.

User Prompt:
"{prompt}"

You must return ONLY a valid JSON object matching the following structure exactly. Do not add markdown formatting or extra text.

Required JSON Structure:
{{
  "app_name": "Title of the application, e.g., 'Muscle Warrior Gym Hub'",
  "app_type": "Type of application, e.g., 'CRM', 'E-Commerce', 'Clinic Booking', 'Gym Membership'",
  "confidence": "high",
  "features": [
    {{
      "name": "snake_case_feature_name, e.g., 'member_registration'",
      "priority": "must-have",
      "source": "explicit"
    }}
  ],
  "roles": [
    {{
      "name": "admin",
      "description": "Administrator with full system privileges."
    }},
    {{
      "name": "member",
      "description": "Registered gym member or customer."
    }}
  ],
  "business_rules": [
    "A member must have an active membership status to book a class.",
    "A trainer cannot teach more than 3 classes per day."
  ],
  "assumptions": [
    "Payments are processed through standard online gateways.",
    "We assume all basic user fields like email and password are required."
  ],
  "ambiguities": [
    "Unclear if user role permissions should be editable by admins."
  ]
}}

Hard Constraints:
1. "features" must include all explicitly requested core capabilities (like login, payments, dashboards, lists).
2. "roles" must always include 'admin' role as it is required by the validation system.
3. Every feature name in the list must be unique and in lower_snake_case.
"""
        response_text = GeminiService.generate(system_prompt)
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", response_text)
            if match:
                return json.loads(match.group(0))
            raise ValueError(f"Failed to parse valid JSON from Intent Agent output: {response_text[:300]}")
