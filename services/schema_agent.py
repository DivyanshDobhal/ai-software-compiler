import json
import re
from services.gemini_service import GeminiService

class SchemaAgent:
    @staticmethod
    def generate(design_json: dict) -> dict:
        system_prompt = f"""You are the Schema Generator Agent inside a software compiler.
Compile the System Design specification into final technical schemas: Database Schema, API Schema, UI Schema, and Authorization Rules.

System Design Input:
{json.dumps(design_json, indent=2)}

You must return ONLY a valid JSON object matching the following structure exactly. Do not add markdown formatting or extra text.

Required JSON Structure:
{{
  "database_schema": {{
    "tables": [
      {{
        "name": "users",
        "columns": [
          {{ "name": "id", "type": "id", "required": true, "references": null }},
          {{ "name": "email", "type": "string", "required": true, "references": null }},
          {{ "name": "role", "type": "string", "required": true, "references": null }}
        ],
        "primary_key": "id",
        "indexes": []
      }},
      {{
        "name": "memberships",
        "columns": [
          {{ "name": "id", "type": "id", "required": true, "references": null }},
          {{ "name": "owner_id", "type": "id", "required": true, "references": "users.id" }},
          {{ "name": "tier_name", "type": "string", "required": true, "references": null }},
          {{ "name": "price", "type": "number", "required": true, "references": null }},
          {{ "name": "status", "type": "string", "required": true, "references": null }}
        ],
        "primary_key": "id",
        "indexes": ["owner_id"]
      }}
    ]
  }},
  "api_schema": {{
    "endpoints": [
      {{
        "path": "/api/users",
        "method": "GET",
        "resource": "users",
        "auth_required": true,
        "allowed_roles": ["admin"],
        "request_body": null,
        "response_body": {{ "users": "array" }}
      }},
      {{
        "path": "/api/memberships",
        "method": "POST",
        "resource": "memberships",
        "auth_required": true,
        "allowed_roles": ["admin", "member"],
        "request_body": {{
          "tier_name": "string",
          "price": "number",
          "status": "string"
        }},
        "response_body": {{ "id": "id", "status": "string" }}
      }}
    ]
  }},
  "ui_schema": {{
    "navigation": [
      {{ "label": "Dashboard", "route": "/dashboard", "roles": ["admin", "member"] }},
      {{ "label": "Memberships", "route": "/memberships", "roles": ["admin", "member"] }}
    ],
    "pages": [
      {{
        "name": "Dashboard",
        "route": "/dashboard",
        "roles": ["admin", "member"],
        "components": ["MetricGrid", "RecentActivity"],
        "api_dependencies": ["/api/memberships"]
      }},
      {{
        "name": "Memberships",
        "route": "/memberships",
        "roles": ["admin", "member"],
        "components": ["DataTable", "RecordForm"],
        "api_dependencies": ["/api/memberships"],
        "resource": "memberships"
      }}
    ]
  }},
  "auth_rules": {{
    "roles": [
      {{ "name": "admin", "inherits": [], "description": "Administrator" }},
      {{ "name": "member", "inherits": [], "description": "Standard member" }}
    ],
    "permissions": {{
      "admin": [
        {{ "resource": "users", "actions": ["create", "read", "update", "delete"] }},
        {{ "resource": "memberships", "actions": ["create", "read", "update", "delete"] }}
      ],
      "member": [
        {{ "resource": "memberships", "actions": ["read", "update"] }}
      ]
    }},
    "flows": [
      {{ "name": "login", "steps": ["validate credentials", "issue token"] }}
    ]
  }}
}}

Hard Constraints:
1. Every API endpoint resource must match an existing table name in "database_schema".
2. Every field listed in endpoint "request_body" must match a column name in the database table.
3. Every UI page role must exist in "auth_rules.roles".
4. Every UI api_dependency path must match an endpoint path in "api_schema.endpoints".
"""
        response_text = GeminiService.generate(system_prompt)
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", response_text)
            if match:
                return json.loads(match.group(0))
            raise ValueError(f"Failed to parse valid JSON from Schema Agent output: {response_text[:300]}")
