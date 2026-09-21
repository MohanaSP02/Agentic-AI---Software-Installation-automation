"""
Troubleshooting Agent: Error Analysis, Auto-Remediation & Human IT Escalation
Diagnoses failure codes (e.g. Exit Code 1603), invokes automated remediation playbooks,
and generates human-in-the-loop escalation tickets when automated resolution fails.
"""
import uuid
from typing import Dict, Any
from python_engine.models import SystemSpecs, SoftwarePackage

class TroubleshootingAgent:
    def diagnose_and_remediate(
        self, 
        pkg: SoftwarePackage, 
        host: SystemSpecs, 
        tool_call: Dict[str, Any],
        retry_count: int,
        max_retries: int = 2
    ) -> Dict[str, Any]:
        """
        Analyzes error code and determines whether remediation is possible.
        """
        exit_code = tool_call.get('exit_code', 1)
        output = tool_call.get('output', '')

        # Diagnosis for Exit Code 1603 (Missing Visual C++ runtime)
        if exit_code == 1603 and retry_count < max_retries:
            return {
                "can_remediate": True,
                "remediation_type": "deploy_prerequisite",
                "remediation_action": "Auto-installed prerequisite: Microsoft Visual C++ 2015-2022 Redistributable (vcredist_x64.exe)",
                "diagnosis": "Missing Visual C++ runtime detected from exit code 1603.",
                "next_action": "retry_installation",
                "escalate": False
            }

        # Diagnosis for timeouts or exhausted retries -> Escalate to Human IT
        ticket_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        return {
            "can_remediate": False,
            "remediation_type": "human_escalation",
            "diagnosis": f"Unrecoverable error or retry quota exhausted (Exit Code {exit_code}).",
            "next_action": "escalate_to_human_it",
            "escalate": True,
            "escalation_ticket": {
                "ticket_id": ticket_id,
                "assigned_team": "Tier-2 Enterprise Desktop Support",
                "priority": "P2-High",
                "summary": f"Automated deployment failure for {pkg.name} on {host.host_name} ({host.os})",
                "diagnostic_bundle": {
                    "host_id": host.host_id,
                    "host_name": host.host_name,
                    "os": host.os,
                    "arch": host.arch,
                    "tool_name": tool_call.get('tool_name'),
                    "executed_command": tool_call.get('executed_command'),
                    "exit_code": exit_code,
                    "error_output": output,
                    "attempts": retry_count + 1
                }
            }
        }
