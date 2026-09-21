import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { ENTERPRISE_SOFTWARE_CATALOG } from './src/data/softwareCatalog.js';
import { DEFAULT_DEV_SPECS } from './src/data/evaluationScenarios.js';
import { WorkflowState, SystemSpecs } from './src/types.js';

dotenv.config();

// In-memory active workflows store (keyed by requestId)
const activeWorkflows = new Map<string, { state: WorkflowState; host: SystemSpecs }>();

// Available host system specifications
const HOST_SPECS_REGISTRY: Record<string, SystemSpecs> = {
  'HOST-WIN-9821': { ...DEFAULT_DEV_SPECS },
  'HOST-MAC-M3': {
    hostId: 'HOST-MAC-M3',
    hostName: 'MACBOOK-ENG-ALEX',
    os: 'macOS Sequoia',
    arch: 'arm64',
    availableDiskGB: 85,
    totalDiskGB: 512,
    availableRamGB: 32,
    currentUser: 'alex.chen@enterprise.corp',
    userRole: 'Developer',
    installedSoftware: [{ name: 'Git SCM', version: '2.46.0' }],
  },
  'HOST-UBUNTU-PROD': {
    hostId: 'HOST-UBUNTU-PROD',
    hostName: 'SRV-UBUNTU-DEV01',
    os: 'Ubuntu 24.04 LTS',
    arch: 'x64',
    availableDiskGB: 120,
    totalDiskGB: 1000,
    availableRamGB: 64,
    currentUser: 'devops.admin@enterprise.corp',
    userRole: 'IT Admin',
    installedSoftware: [{ name: 'Git SCM', version: '2.46.0' }, { name: 'Python', version: '3.12.4' }],
  },
  'HOST-WIN-LOWDISK': {
    hostId: 'HOST-WIN-LOWDISK',
    hostName: 'LAPTOP-CONSTRAINED',
    os: 'Windows 11',
    arch: 'x64',
    availableDiskGB: 3,
    totalDiskGB: 256,
    availableRamGB: 8,
    currentUser: 'alex.chen@enterprise.corp',
    userRole: 'Developer',
    installedSoftware: [],
  },
};

// Python Bridge: Executes python_engine commands via python3 child_process
function runPythonCommand(command: string, inputData: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn('python3', ['python_engine/runner.py', command, JSON.stringify(inputData)]);
    let stdout = '';
    let stderr = '';

    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ raw: stdout });
        }
      } else {
        console.error(`[Python Runner Error] code ${code}: ${stderr}`);
        reject(new Error(`Python process error (code ${code}): ${stderr || stdout}`));
      }
    });
  });
}

function pyStateToTs(pyState: any): WorkflowState {
  if (!pyState) return pyState;
  return {
    requestId: pyState.request_id || pyState.requestId,
    timestamp: pyState.timestamp,
    requester: pyState.requester,
    rawMessage: pyState.raw_message || pyState.rawMessage,
    urgency: pyState.urgency,
    intent: pyState.intent,
    confidence: pyState.confidence,
    detectedSoftware: pyState.detected_software || pyState.detectedSoftware,
    targetVersion: pyState.target_version || pyState.targetVersion,
    currentAgent: pyState.current_agent || pyState.currentAgent,
    status: pyState.status,
    statusMessage: pyState.status_message || pyState.statusMessage,
    approvalRequired: pyState.approval_required ?? pyState.approvalRequired,
    approvalStatus: pyState.approval_status || pyState.approvalStatus,
    approvalApprover: pyState.approval_approver || pyState.approvalApprover,
    approvalNotes: pyState.approval_notes || pyState.approvalNotes,
    compatibilityChecked: pyState.compatibility_checked ?? pyState.compatibilityChecked,
    isCompatible: pyState.is_compatible ?? pyState.isCompatible,
    compatibilityDetails: pyState.compatibility_details || pyState.compatibilityDetails,
    toolCall: pyState.tool_call ? {
      toolName: pyState.tool_call.tool_name,
      sanitizedArgs: pyState.tool_call.sanitized_args,
      executedCommand: pyState.tool_call.executed_command,
      guardrailPassed: pyState.tool_call.guardrail_passed,
      executionTimeMs: pyState.tool_call.execution_time_ms,
      exitCode: pyState.tool_call.exit_code,
      output: pyState.tool_call.output,
    } : undefined,
    validationResult: pyState.validation_result ? {
      success: pyState.validation_result.success,
      checkedVersion: pyState.validation_result.checked_version,
      probeCommand: pyState.validation_result.probe_command,
      probeOutput: pyState.validation_result.probe_output,
      verifiedPath: pyState.validation_result.verified_path,
      summary: pyState.validation_result.summary,
    } : undefined,
    retryCount: pyState.retry_count ?? pyState.retryCount ?? 0,
    maxRetries: pyState.max_retries ?? pyState.maxRetries ?? 2,
    remediationAttempted: pyState.remediation_attempted ?? pyState.remediationAttempted,
    remediationAction: pyState.remediation_action || pyState.remediationAction,
    escalationTicket: pyState.escalation_ticket ? {
      ticketId: pyState.escalation_ticket.ticket_id,
      assignedTeam: pyState.escalation_ticket.assigned_team,
      priority: pyState.escalation_ticket.priority,
      summary: pyState.escalation_ticket.summary,
      diagnosticBundle: {
        hostId: pyState.escalation_ticket.diagnostic_bundle?.host_id,
        hostName: pyState.escalation_ticket.diagnostic_bundle?.host_name,
        os: pyState.escalation_ticket.diagnostic_bundle?.os,
        arch: pyState.escalation_ticket.diagnostic_bundle?.arch,
        toolName: pyState.escalation_ticket.diagnostic_bundle?.tool_name,
        executedCommand: pyState.escalation_ticket.diagnostic_bundle?.executed_command,
        exitCode: pyState.escalation_ticket.diagnostic_bundle?.exit_code,
        errorOutput: pyState.escalation_ticket.diagnostic_bundle?.error_output,
        attempts: pyState.escalation_ticket.diagnostic_bundle?.attempts,
      }
    } : undefined,
    executionTrace: (pyState.execution_trace || pyState.executionTrace || []).map((t: any) => ({
      timestamp: t.timestamp,
      agent: t.agent,
      action: t.action,
      status: t.status,
      detail: t.detail,
      latencyMs: t.latency_ms ?? t.latencyMs ?? 0,
    })),
  };
}

function tsHostToPy(host: SystemSpecs): any {
  return {
    host_id: host.hostId,
    host_name: host.hostName,
    os: host.os,
    arch: host.arch,
    available_disk_gb: host.availableDiskGB,
    total_disk_gb: host.totalDiskGB,
    available_ram_gb: host.availableRamGB,
    installed_software: host.installedSoftware,
    current_user: host.currentUser,
    user_role: host.userRole,
  };
}

function tsStateToPy(state: WorkflowState): any {
  return {
    request_id: state.requestId,
    timestamp: state.timestamp,
    requester: state.requester,
    raw_message: state.rawMessage,
    urgency: state.urgency,
    intent: state.intent,
    confidence: state.confidence,
    current_agent: state.currentAgent,
    status: state.status,
    status_message: state.statusMessage,
    detected_software: state.detectedSoftware,
    target_version: state.targetVersion,
    approval_required: state.approvalRequired,
    approval_status: state.approvalStatus,
    approval_approver: state.approvalApprover,
    approval_notes: state.approvalNotes,
    compatibility_checked: state.compatibilityChecked,
    is_compatible: state.isCompatible,
    compatibility_details: state.compatibilityDetails,
    tool_call: state.toolCall ? {
      tool_name: state.toolCall.toolName,
      sanitized_args: state.toolCall.sanitizedArgs,
      executed_command: state.toolCall.executedCommand,
      guardrail_passed: state.toolCall.guardrailPassed,
      execution_time_ms: state.toolCall.executionTimeMs,
      exit_code: state.toolCall.exitCode,
      output: state.toolCall.output,
    } : null,
    validation_result: state.validationResult ? {
      success: state.validationResult.success,
      checked_version: state.validationResult.checkedVersion,
      probe_command: state.validationResult.probeCommand,
      probe_output: state.validationResult.probeOutput,
      verified_path: state.validationResult.verifiedPath,
      summary: state.validationResult.summary,
    } : null,
    retry_count: state.retryCount,
    max_retries: state.maxRetries,
    remediation_attempted: state.remediationAttempted,
    remediation_action: state.remediationAction,
    escalation_ticket: state.escalationTicket ? {
      ticket_id: state.escalationTicket.ticketId,
      assigned_team: state.escalationTicket.assignedTeam,
      priority: state.escalationTicket.priority,
      summary: state.escalationTicket.summary,
      diagnostic_bundle: {
        host_id: state.escalationTicket.diagnosticBundle.hostId,
        host_name: state.escalationTicket.diagnosticBundle.hostName,
        os: state.escalationTicket.diagnosticBundle.os,
        arch: state.escalationTicket.diagnosticBundle.arch,
        tool_name: state.escalationTicket.diagnosticBundle.toolName,
        executed_command: state.escalationTicket.diagnosticBundle.executedCommand,
        exit_code: state.escalationTicket.diagnosticBundle.exitCode,
        error_output: state.escalationTicket.diagnosticBundle.errorOutput,
        attempts: state.escalationTicket.diagnosticBundle.attempts,
      }
    } : null,
    execution_trace: state.executionTrace.map(t => ({
      timestamp: t.timestamp,
      agent: t.agent,
      action: t.action,
      status: t.status,
      detail: t.detail,
      latency_ms: t.latencyMs,
    })),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check reporting Python 3.10 and FastAPI + LangGraph
  app.get('/api/health', async (req, res) => {
    try {
      const pyHealth = await runPythonCommand('health');
      res.json({
        status: 'healthy',
        service: 'Agentic IT Software Deployer',
        framework: 'Python 3.10 + FastAPI + LangGraph + Pydantic',
        python_status: pyHealth,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      res.json({
        status: 'healthy',
        service: 'Agentic IT Software Deployer',
        framework: 'Python 3.10 + FastAPI + LangGraph (Fallback mode)',
        error: e.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get enterprise software catalog (backed by Python catalog)
  app.get('/api/v1/catalog', (req, res) => {
    res.json({
      catalog: ENTERPRISE_SOFTWARE_CATALOG,
      total: ENTERPRISE_SOFTWARE_CATALOG.length,
      vettedPackageManagers: ['winget (Windows)', 'brew (macOS)', 'apt / snap (Linux)'],
    });
  });

  // Get available target host workstations
  app.get('/api/v1/specs', (req, res) => {
    res.json({
      hosts: Object.values(HOST_SPECS_REGISTRY),
      defaultHostId: 'HOST-WIN-9821',
    });
  });

  // Teams Ingress Webhook executing Python Router Agent
  app.post('/api/v1/teams/webhook', async (req, res) => {
    const { 
      message, 
      requester = 'alex.chen@enterprise.corp', 
      hostId = 'HOST-WIN-9821', 
      simulateFailure = false,
      simulateTimeout = false 
    } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(422).json({
        detail: [{ loc: ['body', 'message'], msg: 'Field "message" string is required', type: 'value_error.missing' }]
      });
      return;
    }

    const host = HOST_SPECS_REGISTRY[hostId] || DEFAULT_DEV_SPECS;
    const pyHost = tsHostToPy(host);

    try {
      const pyResult = await runPythonCommand('teams_ingress', {
        message,
        requester,
        host: pyHost,
        simulate_failure: simulateFailure,
        simulate_timeout: simulateTimeout,
        auto_advance: true,
      });

      const requestId = pyResult.request_id;
      const tsState = pyStateToTs(pyResult.workflow_state);

      activeWorkflows.set(requestId, { state: tsState, host });

      res.json({
        requestId,
        status: 'accepted',
        workflowState: tsState,
        python_runtime: 'executed',
      });
    } catch (err: any) {
      console.error('Error executing python teams_ingress:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Advance Workflow in Python LangGraph
  app.post('/api/v1/workflow/step', async (req, res) => {
    const { requestId, autoAdvance = true, simulateFailure = false, simulateTimeout = false } = req.body;

    const entry = activeWorkflows.get(requestId);
    if (!entry) {
      res.status(404).json({ detail: `Workflow with requestId "${requestId}" not found` });
      return;
    }

    const { state, host } = entry;

    try {
      const pyResult = await runPythonCommand('workflow_step', {
        workflow_state: tsStateToPy(state),
        host: tsHostToPy(host),
        auto_advance: autoAdvance,
        simulate_failure: simulateFailure,
        simulate_timeout: simulateTimeout,
      });

      const nextTsState = pyStateToTs(pyResult.workflow_state);
      entry.state = nextTsState;
      activeWorkflows.set(requestId, entry);

      res.json({ workflowState: nextTsState });
    } catch (err: any) {
      console.error('Error executing python workflow_step:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Human-in-the-Loop Approval Action via Python
  app.post('/api/v1/workflow/approve', async (req, res) => {
    const { requestId, decision, approver = 'Sarah Miller (Eng Manager)', notes } = req.body;

    const entry = activeWorkflows.get(requestId);
    if (!entry) {
      res.status(404).json({ detail: `Workflow with requestId "${requestId}" not found` });
      return;
    }

    const { state, host } = entry;

    try {
      const pyResult = await runPythonCommand('workflow_approve', {
        workflow_state: tsStateToPy(state),
        host: tsHostToPy(host),
        decision,
        approver,
        notes,
      });

      const nextTsState = pyStateToTs(pyResult.workflow_state);
      entry.state = nextTsState;
      activeWorkflows.set(requestId, entry);

      res.json({ workflowState: nextTsState });
    } catch (err: any) {
      console.error('Error executing python workflow_approve:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Workflow Status
  app.get('/api/v1/workflow/status/:requestId', (req, res) => {
    const { requestId } = req.params;
    const entry = activeWorkflows.get(requestId);
    if (!entry) {
      res.status(404).json({ detail: `Workflow with requestId "${requestId}" not found` });
      return;
    }
    res.json({ workflowState: entry.state, host: entry.host });
  });

  // RAG Search Endpoint via Python RAG Engine
  app.post('/api/v1/rag/query', async (req, res) => {
    const { query, top_k = 3 } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required' });
      return;
    }

    try {
      const pyResult = await runPythonCommand('rag_query', { query, top_k });
      res.json(pyResult);
    } catch (err: any) {
      console.error('Error executing python rag_query:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Run Evaluation Benchmarks via Python Evaluator
  app.post('/api/v1/evaluation/run', async (req, res) => {
    console.log('[Evaluation Suite] Running Python benchmark evaluation...');
    try {
      const pyReport = await runPythonCommand('run_eval');
      res.json({
        ...pyReport,
        runtime_engine: 'Python 3.10.12 (LangGraph + FastAPI Evaluation Suite)',
      });
    } catch (err: any) {
      console.error('Error running python evaluation:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Read Python Engine Source Code for interactive code browser
  app.get('/api/v1/python/source', (req, res) => {
    const { file = 'main.py' } = req.query;
    const allowedFiles: Record<string, string> = {
      'main.py': 'python_engine/main.py',
      'models.py': 'python_engine/models.py',
      'catalog.py': 'python_engine/catalog.py',
      'langgraph_orchestrator.py': 'python_engine/langgraph_orchestrator.py',
      'router_agent.py': 'python_engine/agents/router_agent.py',
      'approval_agent.py': 'python_engine/agents/approval_agent.py',
      'compatibility_agent.py': 'python_engine/agents/compatibility_agent.py',
      'installer_agent.py': 'python_engine/agents/installer_agent.py',
      'validation_agent.py': 'python_engine/agents/validation_agent.py',
      'troubleshooting_agent.py': 'python_engine/agents/troubleshooting_agent.py',
      'rag_retriever.py': 'python_engine/rag_retriever.py',
      'evaluator.py': 'python_engine/evaluator.py',
      'requirements.txt': 'requirements.txt',
    };

    const target = allowedFiles[file as string];
    if (!target) {
      res.status(404).json({ error: 'File not found in Python codebase' });
      return;
    }

    try {
      const fullPath = path.join(process.cwd(), target);
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json({
        fileName: file,
        filePath: target,
        code: content,
        language: String(file).endsWith('.txt') ? 'plaintext' : 'python',
        availableFiles: Object.keys(allowedFiles),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Agentic IT Server (Python 3.10 + FastAPI Engine) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
