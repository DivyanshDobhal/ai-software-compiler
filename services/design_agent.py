import json
import re
from services.gemini_service import GeminiService

class DesignAgent:
    @staticmethod
    def design(intent_json: dict) -> dict:
        system_prompt = f"""You are the System Design Agent inside a software compiler.
Design the database entities, tables, fields, relationships, action flows, and role permissions.

Input Intent JSON:
{json.dumps(intent_json, indent=2)}

You must return ONLY a valid JSON object matching the following structure exactly. Do not add markdown formatting or extra text.

Required JSON Structure:
{{
  "entities": [
    {{
      "name": "users",
      "fields": [
        {{ "name": "id", "type": "id", "required": true, "references": null }},
        {{ "name": "email", "type": "string", "required": true, "references": null }},
        {{ "name": "name", "type": "string", "required": true, "references": null }},
        {{ "name": "role", "type": "string", "required": true, "references": null }}
      ]
    }},
    {{
      "name": "memberships",
      "fields": [
        {{ "name": "id", "type": "id", "required": true, "references": null }},
        {{ "name": "owner_id", "type": "id", "required": true, "references": "users.id" }},
        {{ "name": "tier_name", "type": "string", "required": true, "references": null }},
        {{ "name": "price", "type": "number", "required": true, "references": null }},
        {{ "name": "status", "type": "string", "required": true, "references": null }}
      ]
    }}
  ],
  "relationships": [
    {{
      "from": "memberships.owner_id",
      "to": "users.id",
      "type": "many-to-one"
    }}
  ],
  "flows": [
    {{
      "feature": "membership_registration",
      "steps": [
        "Select membership tier",
        "Process credit card details",
        "Create record in memberships table"
      ],
      "success_criteria": "Active membership status is committed to database."
    }}
  ],
  "access_control": {{
    "admin": [
      {{ "resource": "users", "actions": ["create", "read", "update", "delete"] }},
      {{ "resource": "memberships", "actions": ["create", "read", "update", "delete"] }}
    ],
    "member": [
      {{ "resource": "memberships", "actions": ["read", "update"] }}
    ]
  }}
}}

Hard Constraints:
1. Every entity must include fields: 'id' (type 'id', required true).
2. Every entity except 'users' should include an 'owner_id' field referencing 'users.id' to ensure clean ownership schemas.
3. Keep the relationship references strictly matching exact existing table.column fields.
4. "access_control" must cover every role specified in the input Intent JSON (including 'admin').
"""
        response_text = GeminiService.generate(system_prompt)
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", response_text)
            if match:
                return json.loads(match.group(0))
            raise ValueError(f"Failed to parse valid JSON from Design Agent output: {response_text[:300]}")
