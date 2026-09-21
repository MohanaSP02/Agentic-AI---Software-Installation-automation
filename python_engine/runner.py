"""
Python Engine CLI & IPC Runner
Enables direct invocation of FastAPI/LangGraph logic from command line or server process.
"""
import sys
import json
import os
import datetime
import uuid

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python_engine.models import WorkflowState, SystemSpecs
from python_engine.catalog import ENTERPRISE_SOFTWARE_CATALOG, find_software
from python_engine.langgraph_orchestrator import LangGraphOrchestrator
from python_engine.rag_retriever import RAGRetriever
from python_engine.evaluator import EvaluationSuite

orchestrator = LangGraphOrchestrator()
rag_retriever = RAGRetriever()
eval_suite = EvaluationSuite()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command argument"}))
        sys.exit(1)

    command = sys.argv[1]
    input_data = {}
    if len(sys.argv) > 2:
        try:
            input_data = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
            sys.exit(1)

    if command == "health":
        print(json.dumps({
            "status": "operational",
            "runtime": f"Python {sys.version.split()[0]}",
            "architecture": "FastAPI + LangGraph + Pydantic + RAG Vector Retriever",
            "time": datetime.datetime.utcnow().isoformat() + "Z"
        }))

    elif command == "catalog":
        print(json.dumps({
            "catalog": [p.__dict__ for p in ENTERPRISE_SOFTWARE_CATALOG],
            "total": len(ENTERPRISE_SOFTWARE_CATALOG)
        }))

    elif command == "teams_ingress":
        message = input_data.get("message", "")
        requester = input_data.get("requester", "alex.chen@enterprise.corp")
        host_dict = input_data.get("host", {})
        simulate_failure = input_data.get("simulate_failure", False)
        simulate_timeout = input_data.get("simulate_timeout", False)

        host = SystemSpecs(
            host_id=host_dict.get("host_id", "HOST-WIN-9821"),
            host_name=host_dict.get("host_name", "DESKTOP-CORP-ENG12"),
            os=host_dict.get("os", "Windows 11"),
            arch=host_dict.get("arch", "x64"),
            available_disk_gb=float(host_dict.get("available_disk_gb", 45.0)),
            total_disk_gb=float(host_dict.get("total_disk_gb", 512.0)),
            available_ram_gb=float(host_dict.get("available_ram_gb", 16.0)),
            installed_software=host_dict.get("installed_software", [{"name": "Git SCM", "version": "2.46.0"}]),
            current_user=requester,
            user_role=host_dict.get("user_role", "Developer")
        )

        req_id = f"REQ-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        state = WorkflowState(
            request_id=req_id,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z",
            requester=requester,
            raw_message=message,
            urgency="normal",
            intent="software_installation",
            confidence=0.95,
            current_agent="RouterAgent",
            status="received",
            status_message="Ingress validated by FastAPI Pydantic schema."
        )

        # Step through RouterAgent
        state = orchestrator.step(state, host, simulate_failure=simulate_failure, simulate_timeout=simulate_timeout)

        # If user asked for auto advance and not waiting for approval
        if input_data.get("auto_advance", True):
            step_count = 0
            while state.current_agent != "Complete" and state.status != "waiting_approval" and step_count < 8:
                step_count += 1
                state = orchestrator.step(state, host, simulate_failure=simulate_failure, simulate_timeout=simulate_timeout)

        print(json.dumps({
            "request_id": req_id,
            "workflow_state": state.to_dict(),
            "host": host.__dict__
        }))

    elif command == "workflow_step":
        state_dict = input_data.get("workflow_state", {})
        host_dict = input_data.get("host", {})
        auto_advance = input_data.get("auto_advance", True)
        simulate_failure = input_data.get("simulate_failure", False)
        simulate_timeout = input_data.get("simulate_timeout", False)

        host = SystemSpecs(**host_dict)
        state = WorkflowState(**state_dict)

        if auto_advance:
            step_count = 0
            while state.current_agent != "Complete" and state.status != "waiting_approval" and step_count < 8:
                step_count += 1
                state = orchestrator.step(state, host, simulate_failure=simulate_failure, simulate_timeout=simulate_timeout)
        else:
            state = orchestrator.step(state, host, simulate_failure=simulate_failure, simulate_timeout=simulate_timeout)

        print(json.dumps({
            "workflow_state": state.to_dict()
        }))

    elif command == "workflow_approve":
        state_dict = input_data.get("workflow_state", {})
        host_dict = input_data.get("host", {})
        decision = input_data.get("decision", "approve")
        approver = input_data.get("approver", "Sarah Miller (Eng Manager)")
        notes = input_data.get("notes", "Approved via Teams Adaptive Card")

        host = SystemSpecs(**host_dict)
        state = WorkflowState(**state_dict)

        if decision == "approve":
            state.approval_status = "approved"
            state.approval_approver = approver
            state.approval_notes = notes
            state.current_agent = "ApprovalAgent"
            state.status = "checking_approval"
        else:
            state.approval_status = "rejected"
            state.approval_approver = approver
            state.approval_notes = notes
            state.status = "rejected"
            state.current_agent = "Complete"
            state.status_message = f"Rejected by {approver}: {notes}"

        # Step through remaining graph
        step_count = 0
        while state.current_agent != "Complete" and state.status != "waiting_approval" and step_count < 8:
            step_count += 1
            state = orchestrator.step(state, host)

        print(json.dumps({
            "workflow_state": state.to_dict()
        }))

    elif command == "rag_query":
        query = input_data.get("query", "")
        top_k = int(input_data.get("top_k", 3))
        res = rag_retriever.search(query, top_k)
        print(json.dumps(res))

    elif command == "run_eval":
        res = eval_suite.run_all()
        print(json.dumps(res))

    else:
        print(json.dumps({"error": f"Unknown command {command}"}))

if __name__ == "__main__":
    main()
