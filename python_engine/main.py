"""
FastAPI Enterprise Application Entrypoint
Agentic AI Software Installation & Workflow Automation Tool
Integrates Microsoft Teams, LangGraph State Orchestration, Pydantic, and RAG.
"""
from fastapi import FastAPI, HTTPException, Depends, Query, Body, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal
import datetime
import uuid
import logging

from python_engine.models import WorkflowState, SystemSpecs, SoftwarePackage
from python_engine.catalog import ENTERPRISE_SOFTWARE_CATALOG, find_software
from python_engine.langgraph_orchestrator import LangGraphOrchestrator
from python_engine.rag_retriever import RAGRetriever
from python_engine.evaluator import EvaluationSuite

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("FastAPI.Deployer")

# Initialize FastAPI App
app = FastAPI(
    title="Agentic IT Software Deployer API",
    version="1.0.0",
    description="Enterprise automated software installation orchestrated via LangGraph multi-agent framework with Teams integration and RAG policy retrieval."
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared In-Memory State Store & Orchestrator
orchestrator = LangGraphOrchestrator()
rag_retriever = RAGRetriever()
eval_suite = EvaluationSuite()
active_workflows: Dict[str, Dict[str, Any]] = {}

# Pydantic Request & Response Schemas
class TeamsWebhookPayload(BaseModel):
    message: str = Field(..., description="Natural language prompt from user in Microsoft Teams", example="Install Python 3.12 urgently")
    requester: str = Field(default="alex.chen@enterprise.corp", description="Corporate email of user")
    host_id: str = Field(default="HOST-WIN-9821", description="Workstation host identifier")
    simulate_failure: bool = Field(default=False, description="Simulate prerequisite failure to trigger troubleshooting agent")
    simulate_timeout: bool = Field(default=False, description="Simulate package manager socket timeout")

class StepWorkflowPayload(BaseModel):
    request_id: str
    auto_advance: bool = True
    simulate_failure: bool = False
    simulate_timeout: bool = False

class HumanApprovalPayload(BaseModel):
    request_id: str
    decision: Literal['approve', 'reject']
    approver: str = "Sarah Miller (Eng Manager)"
    notes: Optional[str] = None

class RAGQueryPayload(BaseModel):
    query: str = Field(..., example="What is the policy for installing Tableau Desktop?")
    top_k: int = 3

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "framework": "FastAPI (Python 3.10) + LangGraph Multi-Agent Orchestration",
        "service": "Agentic IT Software Deployer",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/v1/catalog", tags=["Catalog"])
def get_catalog():
    return {
        "catalog": [pkg.__dict__ for pkg in ENTERPRISE_SOFTWARE_CATALOG],
        "total_packages": len(ENTERPRISE_SOFTWARE_CATALOG),
        "vetted_tools": ["winget (Windows 11)", "brew (macOS Sequoia)", "apt (Ubuntu LTS)"]
    }

@app.post("/api/v1/teams/webhook", tags=["Teams Ingress"])
def teams_webhook_ingress(payload: TeamsWebhookPayload):
    """
    Ingress point for Microsoft Teams bot messages.
    Generates UUID request ID, logs audit payload, runs RouterAgent classification,
    and initializes LangGraph state.
    """
    request_id = f"REQ-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    logger.info(f"Received Teams prompt from {payload.requester} [Request: {request_id}]: {payload.message}")

    # Build initial state
    state = WorkflowState(
        request_id=request_id,
        timestamp=datetime.datetime.utcnow().isoformat() + "Z",
        requester=payload.requester,
        raw_message=payload.message,
        urgency="normal",
        intent="software_installation",
        confidence=0.95,
        current_agent="RouterAgent",
        status="received",
        status_message="Queued for LangGraph multi-agent processing..."
    )

    # Mock host specs
    host = SystemSpecs(
        host_id=payload.host_id,
        host_name="DESKTOP-CORP-ENG12",
        os="Windows 11",
        arch="x64",
        available_disk_gb=45.0,
        total_disk_gb=512.0,
        available_ram_gb=16.0,
        installed_software=[{"name": "Git SCM", "version": "2.46.0"}],
        current_user=payload.requester,
        user_role="Developer"
    )

    active_workflows[request_id] = {
        "state": state,
        "host": host,
        "simulate_failure": payload.simulate_failure,
        "simulate_timeout": payload.simulate_timeout
    }

    return {
        "request_id": request_id,
        "status": "accepted",
        "workflow_state": state.to_dict()
    }

@app.post("/api/v1/workflow/step", tags=["LangGraph Workflow"])
def step_workflow(payload: StepWorkflowPayload):
    """
    Advances LangGraph state transitions across agents.
    """
    entry = active_workflows.get(payload.request_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Request {payload.request_id} not found")

    state = entry["state"]
    host = entry["host"]

    if payload.auto_advance:
        step_count = 0
        while state.current_agent != "Complete" and state.status != "waiting_approval" and step_count < 8:
            step_count += 1
            state = orchestrator.step(
                state, 
                host, 
                simulate_failure=payload.simulate_failure or entry.get("simulate_failure", False),
                simulate_timeout=payload.simulate_timeout or entry.get("simulate_timeout", False)
            )
    else:
        state = orchestrator.step(
            state, 
            host, 
            simulate_failure=payload.simulate_failure,
            simulate_timeout=payload.simulate_timeout
        )

    entry["state"] = state
    return {"workflow_state": state.to_dict()}

@app.post("/api/v1/workflow/approve", tags=["Human in the Loop"])
def approve_workflow(payload: HumanApprovalPayload):
    """
    Handles Human-in-the-loop managerial sign-off or rejection from Microsoft Teams Adaptive Cards.
    """
    entry = active_workflows.get(payload.request_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Request {payload.request_id} not found")

    state = entry["state"]
    host = entry["host"]

    if payload.decision == "approve":
        state.approval_status = "approved"
        state.approval_approver = payload.approver
        state.approval_notes = payload.notes or "Approved via Teams Adaptive Card"
        state.current_agent = "ApprovalAgent"
    else:
        state.approval_status = "rejected"
        state.approval_approver = payload.approver
        state.approval_notes = payload.notes or "Rejected per IT finance policy"
        state.status = "rejected"
        state.current_agent = "Complete"
        state.status_message = f"Request rejected by {payload.approver}: {state.approval_notes}"

    # Step through remaining graph
    step_count = 0
    while state.current_agent != "Complete" and state.status != "waiting_approval" and step_count < 8:
        step_count += 1
        state = orchestrator.step(state, host)

    entry["state"] = state
    return {"workflow_state": state.to_dict()}

@app.post("/api/v1/rag/query", tags=["RAG Knowledge Base"])
def query_documentation(payload: RAGQueryPayload):
    """
    Retrieves project documentation, security guardrails, and installation playbooks.
    """
    return rag_retriever.search(payload.query, payload.top_k)

@app.post("/api/v1/evaluation/run", tags=["Evaluation Suite"])
def run_evaluation_benchmarks():
    """
    Executes full multi-level benchmark test suite across 7 positive/negative scenarios.
    """
    logger.info("Executing evaluation benchmark suite...")
    return eval_suite.run_all()
