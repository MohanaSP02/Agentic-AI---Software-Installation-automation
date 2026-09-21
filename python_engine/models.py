"""
Pydantic Data Models and Schemas for Agentic IT Software Deployer
Enterprise IT Task Automation & Software Deployment
"""
from typing import List, Dict, Optional, Any, Literal
from dataclasses import dataclass, field, asdict
import json
import uuid
import datetime

UrgencyLevel = Literal['low', 'normal', 'high', 'urgent']
IntentType = Literal[
    'software_installation',
    'status_check',
    'documentation_query',
    'license_inquiry',
    'troubleshooting_support',
    'unrecognized'
]
RequestStatus = Literal[
    'received',
    'routing',
    'checking_approval',
    'waiting_approval',
    'approved',
    'rejected',
    'checking_compatibility',
    'incompatible',
    'installing',
    'validating',
    'troubleshooting',
    'remediating',
    'escalated',
    'completed',
    'failed'
]

@dataclass
class SoftwarePackage:
    id: str
    name: str
    aliases: List[str]
    category: str
    latest_version: str
    supported_versions: List[str]
    requires_approval: bool
    license_type: str
    min_disk_gb: float
    min_ram_gb: float
    supported_os: List[str]
    supported_arch: List[str]
    approval_role: Optional[str] = None
    prerequisites: List[str] = field(default_factory=list)
    vetted_tools: Dict[str, Dict[str, str]] = field(default_factory=dict)
    validation_probe: Dict[str, str] = field(default_factory=dict)

@dataclass
class SystemSpecs:
    host_id: str
    host_name: str
    os: str
    arch: str
    available_disk_gb: float
    total_disk_gb: float
    available_ram_gb: float
    installed_software: List[Dict[str, str]]
    current_user: str
    user_role: str

@dataclass
class ExecutionTraceItem:
    timestamp: str
    agent: str
    action: str
    status: Literal['success', 'warning', 'error', 'info']
    detail: str
    latency_ms: int

@dataclass
class ToolCallRecord:
    tool_name: str
    sanitized_args: Dict[str, Any]
    executed_command: str
    guardrail_passed: bool
    execution_time_ms: int = 0
    exit_code: int = 0
    output: str = ""

@dataclass
class WorkflowState:
    request_id: str
    timestamp: str
    requester: str
    raw_message: str
    urgency: UrgencyLevel
    intent: IntentType
    confidence: float
    current_agent: str
    status: RequestStatus
    status_message: str
    
    # Software details
    detected_software: Optional[str] = None
    target_version: Optional[str] = None
    
    # Approval Agent State
    approval_required: bool = False
    approval_status: Optional[Literal['approved', 'rejected', 'auto_approved', 'pending']] = None
    approval_approver: Optional[str] = None
    approval_notes: Optional[str] = None
    
    # Compatibility Agent State
    compatibility_checked: bool = False
    is_compatible: Optional[bool] = None
    compatibility_details: Optional[Dict[str, Any]] = None
    
    # Installer Agent Tool Call
    tool_call: Optional[Dict[str, Any]] = None
    
    # Validation Agent State
    validation_result: Optional[Dict[str, Any]] = None
    
    # Troubleshooting & Remediation
    retry_count: int = 0
    max_retries: int = 2
    remediation_attempted: bool = False
    remediation_action: Optional[str] = None
    escalation_ticket: Optional[Dict[str, Any]] = None
    
    # Audit Trace
    execution_trace: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
