"""
LangGraph Multi-Agent Orchestrator
Coordinates specialized agents across state transitions, conditional edges,
and human-in-the-loop checkpoints.
"""
import time
from datetime import datetime
from typing import Dict, Any, Optional
from python_engine.models import WorkflowState, SystemSpecs
from python_engine.catalog import find_software
from python_engine.agents.router_agent import RouterAgent
from python_engine.agents.approval_agent import ApprovalAgent
from python_engine.agents.compatibility_agent import CompatibilityAgent
from python_engine.agents.installer_agent import InstallerAgent
from python_engine.agents.validation_agent import ValidationAgent
from python_engine.agents.troubleshooting_agent import TroubleshootingAgent

class LangGraphOrchestrator:
    def __init__(self):
        self.router_agent = RouterAgent()
        self.approval_agent = ApprovalAgent()
        self.compatibility_agent = CompatibilityAgent()
        self.installer_agent = InstallerAgent()
        self.validation_agent = ValidationAgent()
        self.troubleshooting_agent = TroubleshootingAgent()

    def step(
        self, 
        state: WorkflowState, 
        host: SystemSpecs,
        simulate_failure: bool = False,
        simulate_timeout: bool = False
    ) -> WorkflowState:
        """
        Executes the current node in the LangGraph and transitions to the next state.
        """
        start_time = time.time()

        def add_trace(agent: str, action: str, status: str, detail: str):
            state.execution_trace.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent": agent,
                "action": action,
                "status": status,
                "detail": detail,
                "latency_ms": int((time.time() - start_time) * 1000)
            })

        # 1. Router Node
        if state.current_agent == "RouterAgent":
            nlp = self.router_agent.analyze(state.raw_message, host.user_role)
            state.intent = nlp["intent"]
            state.urgency = nlp["urgency"]
            state.confidence = nlp["confidence"]
            state.detected_software = nlp["software_name"]
            state.target_version = nlp["target_version"]

            if not nlp["guardrail_passed"]:
                state.status = "failed"
                state.current_agent = "Complete"
                state.status_message = nlp["reason"]
                add_trace("RouterAgent", "Guardrail Enforcement", "error", nlp["reason"])
                return state

            if state.intent == "documentation_query":
                state.status = "completed"
                state.current_agent = "Complete"
                state.status_message = "Routed to RAG Knowledge Base for query resolution."
                add_trace("RouterAgent", "RAG Intent Classification", "success", "Dispatched to enterprise document retrieval engine.")
                return state

            add_trace("RouterAgent", "Intent Routing", "success", f"Classified intent: {state.intent} ({state.urgency.upper()}) for {state.detected_software}")
            state.current_agent = "ApprovalAgent"
            state.status = "checking_approval"
            state.status_message = f"Checking enterprise license policy for {state.detected_software}..."
            return state

        # Package retrieval
        pkg = find_software(state.detected_software or "")
        if not pkg:
            state.status = "failed"
            state.current_agent = "Complete"
            state.status_message = f"Package '{state.detected_software}' is not registered in enterprise catalog."
            add_trace("RouterAgent", "Catalog Check", "error", state.status_message)
            return state

        # 2. Approval Node
        if state.current_agent == "ApprovalAgent":
            appr = self.approval_agent.check_approval(pkg, state.approval_status)
            state.approval_required = appr["requires_approval"]
            state.approval_notes = appr["notes"]

            if appr["status"] == "pending":
                state.status = "waiting_approval"
                state.status_message = appr["notes"]
                add_trace("ApprovalAgent", "Human Sign-off Required", "warning", f"Dispatched Microsoft Teams Adaptive Card to {pkg.approval_role}.")
                return state

            if appr["status"] == "rejected":
                state.status = "rejected"
                state.current_agent = "Complete"
                state.status_message = f"Request Rejected: {appr['notes']}"
                add_trace("ApprovalAgent", "Approval Rejected", "error", state.status_message)
                return state

            # Auto approved or Manager approved
            state.approval_status = appr["status"]
            state.approval_approver = appr["approver"]
            add_trace("ApprovalAgent", "Policy Cleared", "success", appr["notes"])
            state.current_agent = "CompatibilityAgent"
            state.status = "checking_compatibility"
            state.status_message = "Verifying target host architecture, OS, disk, and RAM prerequisites..."
            return state

        # 3. Compatibility Node
        if state.current_agent == "CompatibilityAgent":
            comp = self.compatibility_agent.verify(pkg, host)
            state.compatibility_checked = True
            state.is_compatible = comp["is_compatible"]
            state.compatibility_details = comp

            if comp.get("already_installed"):
                state.status = "completed"
                state.current_agent = "Complete"
                state.status_message = comp["summary"]
                add_trace("CompatibilityAgent", "Registry Audit", "info", comp["summary"])
                return state

            if not comp["is_compatible"]:
                state.status = "incompatible"
                state.current_agent = "Complete"
                state.status_message = comp["summary"]
                add_trace("CompatibilityAgent", "Prerequisite Failure", "error", comp["summary"])
                return state

            add_trace("CompatibilityAgent", "Prerequisites Verified", "success", f"Host {host.host_name} satisfies all hardware & OS requirements.")
            state.current_agent = "InstallerAgent"
            state.status = "installing"
            state.status_message = f"Calling approved package installer tool for {host.os}..."
            return state

        # 4. Installer Tool Calling Node
        if state.current_agent == "InstallerAgent":
            tool_res = self.installer_agent.prepare_and_execute_tool(
                pkg, 
                host, 
                simulate_failure=(simulate_failure and state.retry_count == 0),
                simulate_timeout=simulate_timeout
            )
            state.tool_call = tool_res

            if not tool_res["guardrail_passed"]:
                state.status = "failed"
                state.current_agent = "Complete"
                state.status_message = tool_res["output"]
                add_trace("InstallerAgent", "Guardrail Violation", "error", tool_res["output"])
                return state

            if tool_res["exit_code"] != 0:
                add_trace("InstallerAgent", "Tool Execution Error", "error", f"Tool {tool_res['tool_name']} exited with code {tool_res['exit_code']}.")
                state.current_agent = "TroubleshootingAgent"
                state.status = "troubleshooting"
                state.status_message = f"Installation tool error detected (Exit Code {tool_res['exit_code']}). Troubleshooting agent analyzing..."
                return state

            add_trace("InstallerAgent", "Tool Execution Success", "success", f"Executed {tool_res['tool_name']} in {tool_res['execution_time_ms']}ms.")
            state.current_agent = "ValidationAgent"
            state.status = "validating"
            state.status_message = "Running post-install health probes and version validation..."
            return state

        # 5. Validation Node
        if state.current_agent == "ValidationAgent":
            val = self.validation_agent.validate_deployment(pkg, host)
            state.validation_result = val
            state.status = "completed"
            state.current_agent = "Complete"
            state.status_message = f"Deployment verified: {pkg.name} {pkg.latest_version} installed and operational on {host.host_name}."
            add_trace("ValidationAgent", "Integrity Check", "success", val["probe_output"])
            return state

        # 6. Troubleshooting Node
        if state.current_agent == "TroubleshootingAgent":
            diag = self.troubleshooting_agent.diagnose_and_remediate(
                pkg, 
                host, 
                state.tool_call or {}, 
                state.retry_count,
                state.max_retries
            )

            if diag["can_remediate"]:
                state.retry_count += 1
                state.remediation_attempted = True
                state.remediation_action = diag["remediation_action"]
                add_trace("TroubleshootingAgent", "Auto-Remediation", "warning", f"Applied fix: {diag['remediation_action']}. Triggering permitted retry #{state.retry_count}.")
                state.current_agent = "InstallerAgent"
                state.status = "remediating"
                state.status_message = f"Prerequisite deployed. Retrying installation (Attempt {state.retry_count} of {state.max_retries})..."
                return state

            # Escalate to human IT
            state.current_agent = "Complete"
            state.status = "escalated"
            state.escalation_ticket = diag["escalation_ticket"]
            state.status_message = f"Automated deployment halted. Escalated to Tier-2 IT Support: Ticket #{diag['escalation_ticket']['ticket_id']}."
            add_trace("TroubleshootingAgent", "Human Escalation", "error", f"Created support ticket {diag['escalation_ticket']['ticket_id']}.")
            return state

        return state
