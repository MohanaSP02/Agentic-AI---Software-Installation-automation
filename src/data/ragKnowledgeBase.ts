import { RAGDocument } from '../types.js';

export const ENTERPRISE_RAG_DOCS: RAGDocument[] = [
  {
    id: 'doc-001',
    title: 'Enterprise Software Deployment Policy (SEC-POL-402)',
    category: 'Policy',
    tags: ['policy', 'approval', 'licensing', 'security', 'compliance'],
    content: `All software installed on company-managed workstations must comply with corporate IT standard SEC-POL-402.
1. Pre-Approved Software: Standard developer tools including Python 3.x, Git, VS Code, Node.js LTS, PostgreSQL, and Docker Desktop are pre-approved for engineering staff and do not require prior managerial sign-off.
2. Paid / Licensed Software: Tools requiring dedicated paid seats (such as IntelliJ IDEA Ultimate, Tableau Desktop, Adobe Creative Cloud) mandate electronic approval from the employee's direct Engineering/Analytics Manager and IT Asset Management.
3. Prohibited Software: Unvetted freeware, torrent clients, unauthorized VPN tunnels, and browser cryptominers are strictly forbidden. Any request for unauthorized software is halted immediately by agent security guardrails.`,
  },
  {
    id: 'doc-002',
    title: 'Agentic Architecture: FastAPI & LangGraph Orchestration',
    category: 'Architecture',
    tags: ['langgraph', 'fastapi', 'agents', 'architecture', 'orchestration', 'workflow'],
    content: `The Agentic IT Software Deployer leverages a high-throughput FastAPI service communicating with a LangGraph state graph.
1. FastAPI API Layer: Serves as the primary ingress between Microsoft Teams Bot webhooks and agentic workflows. Generates unique UUID v4 request IDs, enforces Pydantic payload validation, and handles non-blocking async execution.
2. Router Agent: Examines raw natural language prompts, applies NLP intent extraction (intent type: installation, query, status, troubleshooting) and urgency tagging (Urgent, High, Normal, Low) based on keywords and sentiment.
3. LangGraph Coordination: Workflow state is transitioned across deterministic checkpoints: Router -> Approval -> Compatibility -> Installer -> Validation -> Troubleshooting -> Human Escalation.
4. Human-in-the-Loop: If the Approval Agent flags that a software package requires managerial sign-off, the LangGraph pauses state and posts an interactive Adaptive Card with Approve/Reject actions to the IT/Manager channel.`,
  },
  {
    id: 'doc-003',
    title: 'Tool Calling Security Guardrails & Sandboxing Specification',
    category: 'Security Guardrails',
    tags: ['tool calling', 'guardrails', 'security', 'sandboxing', 'vetted tools'],
    content: `Agents are strictly prohibited from executing arbitrary command-line strings, bash scripts, or elevated PowerShell code directly.
1. Tool Calling Protocol: The Installer Agent must invoke pre-registered, vetted tool functions (e.g. winget_install, brew_install, apt_install).
2. Parameter Sanitization: Tool arguments (package ID, version flag, silent mode) are validated against an allowlist schema. Special characters (;, &&, ||, \`, $, <, >) trigger an immediate Guardrail Violation Exception.
3. Execution Audit: Every tool execution is recorded with timestamp, user ID, exact binary path, exit status, and SHA-256 hash in the enterprise SIEM log.`,
  },
  {
    id: 'doc-004',
    title: 'Automated Troubleshooting & Auto-Remediation Playbook',
    category: 'Troubleshooting',
    tags: ['troubleshooting', 'remediation', 'error 1603', 'retry', 'escalation', 'playbook'],
    content: `When the Validation Agent or Installer Agent encounters a non-zero exit code:
1. Error Code 1603 (Fatal Error during installation): Typically indicates missing runtime dependencies (such as Microsoft Visual C++ 2015-2022 Redistributable) or locked file handles. The Troubleshooting Agent initiates automatic installation of the missing prerequisite and triggers a permitted retry (max 2 retries).
2. Error Code 3010 / Reboot Required: The agent registers a deferred reboot schedule and checks whether secondary path registration succeeded.
3. Incompatible Hardware/OS: The Compatibility Agent preemptively checks OS architecture (x64 vs arm64) and minimum disk/RAM thresholds before attempting installation.
4. Human Escalation: If automated remediation fails after max allowed retries (2), the agent synthesizes a complete diagnostic bundle and generates an IT Support ServiceNow/Jira incident.`,
  },
  {
    id: 'doc-005',
    title: 'Multi-Level Evaluation & Testing Benchmark Methodology',
    category: 'Architecture',
    tags: ['evaluation', 'benchmarks', 'testing', 'intent accuracy', 'validation'],
    content: `The system undergoes rigorous multi-level evaluation:
Level 1 - Router Intent Accuracy: Verifies that the Router Agent classifies user intent (installation vs inquiry) and urgency levels correctly (target benchmark: >95%).
Level 2 - Tool Selection Accuracy: Validates that the Installer Agent selects the exact approved package manager tool matching the target machine's operating system (Windows -> winget, macOS -> brew, Linux -> apt).
Level 3 - Execution Success & Validation: Measures installation success rate and post-installation validation probe accuracy.
Level 4 - Telemetry & Resilience: Continuously monitors latency (p50 < 2.5s), retry rates (<8%), and human escalation rates (<5% for standard packages).`,
  },
];
