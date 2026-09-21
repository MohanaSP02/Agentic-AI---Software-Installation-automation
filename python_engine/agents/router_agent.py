"""
Router Agent: Natural Language Processing (NLP) Intent & Urgency Classifier
Analyzes incoming user requests from Microsoft Teams and routes to specialized workflows.
"""
import re
from typing import Dict, Any, Tuple
from python_engine.models import IntentType, UrgencyLevel
from python_engine.catalog import ENTERPRISE_SOFTWARE_CATALOG, find_software

PROHIBITED_TERMS = ['cryptominer', 'crypto miner', 'torrent', 'keygen', 'crack', 'hack', 'keylogger', 'botnet']

class RouterAgent:
    def __init__(self):
        self.catalog = ENTERPRISE_SOFTWARE_CATALOG

    def analyze(self, message: str, user_role: str = "Developer") -> Dict[str, Any]:
        """
        Classifies user intent, urgency level, and target software package.
        Enforces security guardrails against malicious or unapproved tools.
        """
        lower_msg = message.lower()

        # Guardrail Check
        for term in PROHIBITED_TERMS:
            if term in lower_msg:
                return {
                    "intent": "unrecognized",
                    "urgency": "low",
                    "software_name": None,
                    "target_version": None,
                    "confidence": 0.99,
                    "reason": f"Enterprise Guardrail Violation: '{term}' is strictly prohibited by SEC-POL-402.",
                    "guardrail_passed": False
                }

        # Urgency Detection via NLP sentiment & lexical cues
        urgency: UrgencyLevel = "normal"
        if any(w in lower_msg for w in ['urgent', 'critically', 'critical', 'blocker', 'immediately', 'production down', 'prod']):
            urgency = "urgent"
        elif any(w in lower_msg for w in ['asap', 'today', 'high priority', 'need soon', 'eod']):
            urgency = "high"
        elif any(w in lower_msg for w in ['when you have time', 'low priority', 'no rush', 'optional']):
            urgency = "low"

        # Intent Detection
        intent: IntentType = "software_installation"
        if any(w in lower_msg for w in ['status of', 'check ticket', 'where is my', 'order status', 'progress']):
            intent = "status_check"
        elif any(w in lower_msg for w in ['policy', 'how do i', 'how to', 'guidelines', 'documentation', 'what is the', 'faq']):
            intent = "documentation_query"
        elif any(w in lower_msg for w in ['license', 'how much', 'cost', 'seats available', 'license key']):
            intent = "license_inquiry"
        elif any(w in lower_msg for w in ['error', 'failed to', 'broken', 'not working', 'crash', 'exit code']):
            intent = "troubleshooting_support"

        # Catalog Matching
        detected_pkg = find_software(message)
        
        # Version extraction (e.g. 3.12, 16.4)
        version_match = re.search(r'\b\d+(\.\d+)+', message)
        target_version = version_match.group(0) if version_match else (detected_pkg.latest_version if detected_pkg else None)

        if not detected_pkg and intent == "software_installation":
            # Check if user mentioned an unknown software
            match = re.search(r'(?:install|setup|deploy|get)\s+([A-Za-z0-9_\-\.]+)', message, re.IGNORECASE)
            if match:
                unknown_candidate = match.group(1)
                return {
                    "intent": "unrecognized",
                    "urgency": urgency,
                    "software_name": unknown_candidate,
                    "target_version": None,
                    "confidence": 0.85,
                    "reason": f"Software '{unknown_candidate}' is not present in approved enterprise catalog.",
                    "guardrail_passed": False
                }

        return {
            "intent": intent,
            "urgency": urgency,
            "software_name": detected_pkg.name if detected_pkg else None,
            "target_version": target_version,
            "confidence": 0.96 if detected_pkg else 0.78,
            "reason": f"Identified {intent} with {urgency.upper()} priority for {detected_pkg.name if detected_pkg else 'query'}.",
            "guardrail_passed": True
        }
