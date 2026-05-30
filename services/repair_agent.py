import json
import re
import logging
from services.gemini_service import GeminiService

logger = logging.getLogger("RepairAgent")

class RepairAgent:
    @staticmethod
    def _call_and_parse(prompt: str) -> dict:
        """
        Calls GeminiService.generate and robustly extracts and parses JSON from the response.
        """
        response_text = GeminiService.generate(prompt)
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback regex parsing to extract JSON object from markdown block or loose text
            match = re.search(r"\{[\s\S]*\}", response_text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError as e:
                    raise ValueError(f"Regex found a JSON candidate but failed to parse: {str(e)}")
            raise ValueError(f"Failed to parse valid JSON from Gemini output: {response_text[:300]}")

    @staticmethod
    def repair(bundle: dict, validation_results: dict) -> dict:
        """
        Repairs only the failing parts of the schemas based on validation errors.
        Does NOT regenerate the entire application.
        """
        errors = validation_results.get("errors", [])
        if not errors:
            return {
                "bundle": bundle,
                "applied_repairs": []
            }

        schemas = bundle.get("schemas", {})
        repaired_schemas = {
            "ui_schema": schemas.get("ui_schema", {}),
            "api_schema": schemas.get("api_schema", {}),
            "db_schema": schemas.get("db_schema", {}),
            "auth_schema": schemas.get("auth_schema", {}),
            "business_logic": schemas.get("business_logic", {})
        }

        applied_repairs = []

        # Group errors by layer
        db_errors = [e for e in errors if e["type"] in ["unknown_api_resource", "unknown_ui_resource", "empty_db"]]
        api_errors = [e for e in errors if e["type"] in ["empty_api", "unknown_api_role", "hallucinated_api_field"]]
        ui_errors = [e for e in errors if e["type"] in ["empty_ui", "unknown_ui_role", "missing_ui_api"]]
        auth_errors = [e for e in errors if e["type"] in ["missing_admin"]]

        # 1. Repair Database Schema
        if db_errors:
            applied_repairs.append(f"Repairing Database Schema ({len(db_errors)} errors)")
            db_schema_prompt = f"""You are the Database Repair Agent inside a software compiler.
Your task is to fix the Database Schema based on specific validation errors. Do not alter other schemas.

Current Database Schema:
{json.dumps(repaired_schemas["db_schema"], indent=2)}

Validation Errors to resolve:
{json.dumps(db_errors, indent=2)}

Reference System Design:
{json.dumps(bundle.get("design", {}), indent=2)}

You must return ONLY a valid JSON object matching the database schema structure:
{{
  "tables": [
    {{
      "name": "table_name",
      "columns": [
        {{ "name": "column_name", "type": "string/number/boolean/id/date/datetime", "required": true/false, "references": "table.column_name or null" }}
      ],
      "primary_key": "id",
      "indexes": ["column_name"]
    }}
  ]
}}
Ensure that all missing tables or columns referenced in the errors are created and properly defined.
"""
            try:
                repaired_db = RepairAgent._call_and_parse(db_schema_prompt)
                if "tables" in repaired_db:
                    repaired_schemas["db_schema"] = repaired_db
            except Exception as e:
                logger.error(f"Database repair execution failed: {str(e)}")
                applied_repairs.append(f"Database repair failed: {str(e)}")

        # 2. Repair API Schema
        if api_errors:
            applied_repairs.append(f"Repairing API Schema ({len(api_errors)} errors)")
            api_schema_prompt = f"""You are the API Repair Agent.
Your task is to fix the API Schema based on specific validation errors.

Current API Schema:
{json.dumps(repaired_schemas["api_schema"], indent=2)}

Validation Errors to resolve:
{json.dumps(api_errors, indent=2)}

Reference Database Schema:
{json.dumps(repaired_schemas["db_schema"], indent=2)}

You must return ONLY a valid JSON object matching the api schema structure:
{{
  "endpoints": [
    {{
      "path": "/api/resource",
      "method": "POST/GET/PUT/DELETE",
      "resource": "resource_table_name",
      "auth_required": true/false,
      "allowed_roles": ["admin"],
      "request_body": {{ "column_name": "type" }},
      "response_body": {{}}
    }}
  ]
}}
Ensure that any hallucinated API request fields not matching the DB tables are removed or aligned, and endpoints match actual DB tables.
"""
            try:
                repaired_api = RepairAgent._call_and_parse(api_schema_prompt)
                if "endpoints" in repaired_api:
                    repaired_schemas["api_schema"] = repaired_api
            except Exception as e:
                logger.error(f"API repair execution failed: {str(e)}")
                applied_repairs.append(f"API repair failed: {str(e)}")

        # 3. Repair UI Schema
        if ui_errors:
            applied_repairs.append(f"Repairing UI Schema ({len(ui_errors)} errors)")
            ui_schema_prompt = f"""You are the UI Repair Agent.
Your task is to fix the UI Schema pages and dependencies.

Current UI Schema:
{json.dumps(repaired_schemas["ui_schema"], indent=2)}

Validation Errors to resolve:
{json.dumps(ui_errors, indent=2)}

Reference API Endpoints:
{json.dumps(repaired_schemas["api_schema"], indent=2)}

You must return ONLY a valid JSON object matching the ui schema structure:
{{
  "navigation": [
    {{ "label": "Label", "route": "/route", "roles": ["admin"] }}
  ],
  "pages": [
    {{
      "name": "PageName",
      "route": "/route",
      "roles": ["admin"],
      "components": ["DataTable"],
      "api_dependencies": ["/api/resource"],
      "resource": "resource_table_name"
    }}
  ]
}}
Ensure that all routes and API dependencies are verified and correctly aligned with the API endpoints.
"""
            try:
                repaired_ui = RepairAgent._call_and_parse(ui_schema_prompt)
                if "pages" in repaired_ui:
                    repaired_schemas["ui_schema"] = repaired_ui
            except Exception as e:
                logger.error(f"UI repair execution failed: {str(e)}")
                applied_repairs.append(f"UI repair failed: {str(e)}")

        # 4. Repair Auth Schema
        if auth_errors:
            applied_repairs.append(f"Repairing Auth Schema ({len(auth_errors)} errors)")
            auth_schema_prompt = f"""You are the Auth Repair Agent.
Your task is to fix the Auth Schema.

Current Auth Schema:
{json.dumps(repaired_schemas["auth_schema"], indent=2)}

Validation Errors to resolve:
{json.dumps(auth_errors, indent=2)}

You must return ONLY a valid JSON object matching the auth schema structure:
{{
  "roles": [
    {{ "name": "role_name", "inherits": [], "description": "desc" }}
  ],
  "permissions": {{
    "admin": [
      {{ "resource": "res", "actions": ["create", "read"] }}
    ]
  }},
  "flows": []
}}
Ensure that the 'admin' role is correctly created and Permissions exist for all roles.
"""
            try:
                repaired_auth = RepairAgent._call_and_parse(auth_schema_prompt)
                if "roles" in repaired_auth:
                    repaired_schemas["auth_schema"] = repaired_auth
            except Exception as e:
                logger.error(f"Auth repair execution failed: {str(e)}")
                applied_repairs.append(f"Auth repair failed: {str(e)}")

        # Create updated bundle
        updated_bundle = dict(bundle)
        updated_bundle["schemas"] = repaired_schemas

        return {
            "bundle": updated_bundle,
            "applied_repairs": applied_repairs
        }
