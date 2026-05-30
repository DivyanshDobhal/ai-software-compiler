class Validator:
    @staticmethod
    def validate(bundle: dict) -> dict:
        """
        Validates the generated compiler schemas for structural errors.
        Returns a dictionary containing:
        {
          "errors": [{"type": "...", "path": "...", "message": "..."}],
          "warnings": []
        }
        """
        errors = []
        warnings = []

        schemas = bundle.get("schemas", {})
        intent = bundle.get("intent", {})
        design = bundle.get("design", {}) or bundle.get("architecture", {})

        # 1. Check for missing layers
        required_layers = ["ui_schema", "api_schema", "db_schema", "auth_schema"]
        for layer in required_layers:
            if layer not in schemas or not schemas[layer]:
                errors.append({
                    "type": "missing_layer",
                    "path": layer,
                    "message": f"{layer} is missing or empty."
                })

        if errors:
            return {"errors": errors, "warnings": warnings}

        # 2. Extract references
        db_schema = schemas.get("db_schema", {})
        tables = {table["name"]: table for table in db_schema.get("tables", [])}
        
        auth_schema = schemas.get("auth_schema", {})
        roles = {role["name"] for role in auth_schema.get("roles", [])}
        roles.add("guest") # guest is always implicit

        api_schema = schemas.get("api_schema", {})
        endpoints = api_schema.get("endpoints", [])

        ui_schema = schemas.get("ui_schema", {})

        # Empty schema validations
        if not ui_schema.get("pages"):
            errors.append({
                "type": "empty_ui",
                "path": "ui_schema.pages",
                "message": "At least one UI page is required."
            })
        if not endpoints:
            errors.append({
                "type": "empty_api",
                "path": "api_schema.endpoints",
                "message": "At least one API endpoint is required."
            })
        if not tables:
            errors.append({
                "type": "empty_db",
                "path": "db_schema.tables",
                "message": "At least one database table is required."
            })
        if "admin" not in roles:
            errors.append({
                "type": "missing_admin",
                "path": "auth_schema.roles",
                "message": "Admin role is required."
            })

        # API ↔ DB Mismatches & API Role Checks
        for endpoint in endpoints:
            path = endpoint.get("path", "")
            resource = endpoint.get("resource", "")
            
            # API ↔ DB resource check
            if resource not in tables:
                errors.append({
                    "type": "unknown_api_resource",
                    "path": path,
                    "message": f"Endpoint references missing database table: '{resource}'."
                })
            
            # API ↔ Auth Roles check
            for role in endpoint.get("allowed_roles", []):
                if role not in roles:
                    errors.append({
                        "type": "unknown_api_role",
                        "path": path,
                        "message": f"Endpoint references missing role: '{role}'."
                    })

            # Hallucinated field check (API Request schema fields not in DB columns)
            table = tables.get(resource)
            if table and endpoint.get("request_body"):
                columns = {col["name"] for col in table.get("columns", [])}
                for field_name in endpoint["request_body"].keys():
                    if field_name not in columns:
                        errors.append({
                            "type": "hallucinated_api_field",
                            "path": path,
                            "message": f"'{field_name}' is not a column on database table '{table['name']}'."
                        })

        # UI ↔ API Mismatches
        for page in ui_schema.get("pages", []):
            route = page.get("route", "")
            
            # UI Page ↔ Auth Roles check
            for role in page.get("roles", []):
                if role not in roles:
                    errors.append({
                        "type": "unknown_ui_role",
                        "path": route,
                        "message": f"Page references missing role: '{role}'."
                    })
            
            # UI Page ↔ DB Table resource check
            resource = page.get("resource", "")
            if resource and resource not in tables:
                errors.append({
                    "type": "unknown_ui_resource",
                    "path": route,
                    "message": f"Page references missing database table: '{resource}'."
                })
            
            # UI ↔ API Endpoint dependencies check
            for api_path in page.get("api_dependencies", []):
                if not any(endpoint.get("path") == api_path for endpoint in endpoints):
                    errors.append({
                        "type": "missing_ui_api",
                        "path": route,
                        "message": f"Page depends on missing endpoint: '{api_path}'."
                    })

        # Business Logic Mismatches
        business_logic = schemas.get("business_logic", {})
        for rule in business_logic.get("rules", []):
            rule_id = rule.get("id", "")
            for entity in rule.get("affected_entities", []):
                if entity not in tables:
                    errors.append({
                        "type": "unknown_logic_entity",
                        "path": rule_id,
                        "message": f"Business rule references missing entity '{entity}'."
                    })

        # Ambiguity / Complexity Warnings
        if intent.get("ambiguities"):
            for amb in intent["ambiguities"]:
                warnings.append({
                    "type": "assumption_required",
                    "path": "intent.ambiguities",
                    "message": amb
                })

        return {"errors": errors, "warnings": warnings}
