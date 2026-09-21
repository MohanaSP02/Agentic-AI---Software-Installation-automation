export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent';

export type RequestStatus = 
  | 'received'
  | 'routing'
  | 'checking_approval'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'checking_compatibility'
  | 'incompatible'
  | 'installing'
  | 'validating'
  | 'troubleshooting'
  | 'remediating'
  | 'escalated'
  | 'completed'
  | 'failed';

export type IntentType = 
  | 'software_installation'
  | 'status_check'
  | 'documentation_query'
  | 'license_inquiry'
  | 'troubleshooting_support'
  | 'unrecognized';

export interface SystemSpecs {
  hostId: string;
  hostName: string;
  os: 'Windows 11' | 'macOS Sequoia' | 'Ubuntu 24.04 LTS';
  arch: 'x64' | 'arm64';
  availableDiskGB: number;
  totalDiskGB: number;
  availableRamGB: number;
  installedSoftware: Array<{ name: string; version: string }>;
  currentUser: string;
  userRole: 'Developer' | 'Analyst' | 'Designer' | 'IT Admin';
}

export interface SoftwarePackage {
  id: string;
  name: string;
  aliases: string[];
  category: 'Development' | 'Productivity' | 'Database' | 'DevOps' | 'Security' | 'Design';
  latestVersion: string;
  supportedVersions: string[];
  requiresApproval: boolean;
  approvalRole?: string;
  licenseType: 'Free / Open Source' | 'Enterprise Site License' | 'Per-Seat Paid' | 'Restricted';
  minDiskGB: number;
  minRamGB: number;
  supportedOS: Array<'Windows 11' | 'macOS Sequoia' | 'Ubuntu 24.04 LTS'>;
  supportedArch: Array<'x64' | 'arm64'>;
  prerequisites?: string[];
  vettedTools: {
    windows?: { tool: 'winget' | 'choco'; command: string };
    mac?: { tool: 'brew'; command: string };
    linux?: { tool: 'apt' | 'snap'; command: string };
  };
  validationProbe: {
    command: string;
    expectedPattern: string;
  };
}

export interface WorkflowState {
  requestId: string;
  timestamp: string;
  requester: string;
  rawMessage: string;
  urgency: UrgencyLevel;
  intent: IntentType;
  confidence: number;
  detectedSoftware?: string;
  targetVersion?: string;
  
  // Agent States
  currentAgent: 'RouterAgent' | 'ApprovalAgent' | 'CompatibilityAgent' | 'InstallerAgent' | 'ValidationAgent' | 'TroubleshootingAgent' | 'HumanEscalation' | 'Complete';
  status: RequestStatus;
  statusMessage: string;
  
  // Approvals
  approvalRequired: boolean;
  approvalStatus?: 'approved' | 'rejected' | 'auto_approved' | 'pending';
  approvalApprover?: string;
  approvalNotes?: string;

  // Compatibility
  compatibilityChecked: boolean;
  isCompatible?: boolean;
  compatibilityDetails?: {
    osMatch: boolean;
    archMatch: boolean;
    diskSufficient: boolean;
    ramSufficient: boolean;
    missingPrerequisites: string[];
    notes: string;
  };

  // Tool Calling & Execution
  toolCall?: {
    toolName: string;
    sanitizedArgs: Record<string, any>;
    executedCommand: string;
    guardrailPassed: boolean;
    executionTimeMs?: number;
    output?: string;
    exitCode?: number;
  };

  // Validation
  validationResult?: {
    success: boolean;
    checkedVersion?: string;
    probeCommand?: string;
    probeOutput: string;
    verifiedPath: string;
    summary?: string;
  };

  // Troubleshooting & Retries
  retryCount: number;
  maxRetries: number;
  remediationAttempted?: boolean;
  remediationAction?: string;
  escalationTicket?: {
    ticketId: string;
    assignedTeam: string;
    priority?: string;
    diagnosticBundle: Record<string, any>;
    summary: string;
  };

  // Execution Telemetry
  executionTrace: Array<{
    timestamp: string;
    agent: string;
    action: string;
    status: 'success' | 'warning' | 'error' | 'info';
    detail: string;
    latencyMs: number;
  }>;
}

export interface TeamsMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  senderName: string;
  avatar?: string;
  timestamp: string;
  content: string;
  adaptiveCard?: {
    title: string;
    type: 'install_progress' | 'approval_prompt' | 'completion_summary' | 'troubleshoot_escalation' | 'rag_answer';
    data: any;
  };
}

export interface RAGDocument {
  id: string;
  title: string;
  category: 'Policy' | 'Troubleshooting' | 'Security Guardrails' | 'Architecture';
  content: string;
  tags: string[];
}

export interface EvaluationScenario {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  description: string;
  inputMessage: string;
  targetHost: SystemSpecs;
  expectedOutcome: {
    expectedIntent: IntentType;
    expectedTool: string;
    shouldPassApproval: boolean;
    shouldPassCompatibility: boolean;
    shouldInstall: boolean;
    shouldEscalate: boolean;
  };
}

export interface EvaluationMetricReport {
  timestamp: string;
  totalRuns: number;
  intentAccuracy: number; // percentage
  toolSelectionAccuracy: number;
  installationSuccessRate: number;
  validationAccuracy: number;
  averageLatencyMs: number;
  failureRate: number;
  retryRate: number;
  humanEscalationRate: number;
  guardrailBlockRate: number;
  scenarioResults: Array<{
    scenarioId: string;
    name: string;
    passed: boolean;
    actualIntent: IntentType;
    actualTool: string;
    durationMs: number;
    notes: string;
  }>;
}

export type EvaluationReport = any;
