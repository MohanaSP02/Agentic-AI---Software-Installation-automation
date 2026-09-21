import { GoogleGenAI } from '@google/genai';
import { 
  WorkflowState, 
  SystemSpecs, 
  SoftwarePackage, 
  IntentType, 
  UrgencyLevel 
} from '../src/types.js';
import { ENTERPRISE_SOFTWARE_CATALOG } from '../src/data/softwareCatalog.js';
import { ENTERPRISE_RAG_DOCS } from '../src/data/ragKnowledgeBase.js';

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Helper to determine urgency and intent with Gemini or fallback heuristics
export async function analyzePromptWithNLP(
  prompt: string, 
  requesterRole: string = 'Developer'
): Promise<{
  intent: IntentType;
  urgency: UrgencyLevel;
  softwareName?: string;
  targetVersion?: string;
  reason: string;
  confidence: number;
}> {
  const lower = prompt.toLowerCase();
  
  // Guardrail check: Disallow explicitly malicious or unauthorized phrases
  if (lower.includes('cryptominer') || lower.includes('torrent') || lower.includes('hack') || lower.includes('keylogger')) {
    return {
      intent: 'unrecognized',
      urgency: 'low',
      reason: 'Flagged by enterprise security guardrails: Prohibited software keyword',
      confidence: 0.99,
    };
  }

  // Try Gemini AI router analysis first if available
  const ai = getGemini();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Router Agent in an Enterprise IT Agentic Automation system.
Analyze this user request from a company employee (${requesterRole}):
"${prompt}"

Known approved catalog: ${ENTERPRISE_SOFTWARE_CATALOG.map(s => s.name).join(', ')}.

Respond in strict JSON with the following structure:
{
  "intent": "software_installation" | "documentation_query" | "status_check" | "license_inquiry" | "troubleshooting_support" | "unrecognized",
  "urgency": "low" | "normal" | "high" | "urgent",
  "softwareName": "Matched catalog software name or null",
  "targetVersion": "Version string or null",
  "reason": "One sentence reasoning",
  "confidence": 0.95
}
Notes on urgency: "urgent" or "critical" or "blocking production" -> "urgent". "today" or "asap" -> "high". standard request -> "normal".`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          intent: parsed.intent || 'software_installation',
          urgency: parsed.urgency || 'normal',
          softwareName: parsed.softwareName || undefined,
          targetVersion: parsed.targetVersion || undefined,
          reason: parsed.reason || 'Analyzed via Gemini Router Agent',
          confidence: parsed.confidence || 0.94,
        };
      }
    } catch (err) {
      console.warn('Gemini router analysis fallback to heuristic:', err);
    }
  }

  // Fallback NLP / Keyword heuristic engine
  let urgency: UrgencyLevel = 'normal';
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('immediately') || lower.includes('blocker') || lower.includes('prod')) {
    urgency = 'urgent';
  } else if (lower.includes('asap') || lower.includes('today') || lower.includes('high priority')) {
    urgency = 'high';
  } else if (lower.includes('when you have time') || lower.includes('low priority') || lower.includes('optional')) {
    urgency = 'low';
  }

  let intent: IntentType = 'software_installation';
  if (lower.includes('status of') || lower.includes('check ticket') || lower.includes('where is my')) {
    intent = 'status_check';
  } else if (lower.includes('policy') || lower.includes('how to') || lower.includes('guidelines') || lower.includes('documentation') || lower.includes('what is the')) {
    intent = 'documentation_query';
  } else if (lower.includes('license') || lower.includes('cost') || lower.includes('seat')) {
    intent = 'license_inquiry';
  } else if (lower.includes('error') || lower.includes('broken') || lower.includes('failed') || lower.includes('not working')) {
    intent = 'troubleshooting_support';
  }

  // Find software match
  let detectedSoftware: SoftwarePackage | undefined;
  for (const pkg of ENTERPRISE_SOFTWARE_CATALOG) {
    if (pkg.aliases.some(alias => lower.includes(alias.toLowerCase()))) {
      detectedSoftware = pkg;
      break;
    }
  }

  return {
    intent,
    urgency,
    softwareName: detectedSoftware ? detectedSoftware.name : undefined,
    reason: detectedSoftware ? `Identified software installation intent for ${detectedSoftware.name}` : 'Identified user intent',
    confidence: detectedSoftware ? 0.96 : 0.75,
  };
}

// Find software package from catalog
export function findSoftwareInCatalog(nameOrAlias: string): SoftwarePackage | undefined {
  const lower = nameOrAlias.toLowerCase().trim();
  return ENTERPRISE_SOFTWARE_CATALOG.find(pkg => 
    pkg.name.toLowerCase() === lower || 
    pkg.aliases.some(a => lower.includes(a.toLowerCase()) || a.toLowerCase() === lower)
  );
}

// State Machine Execution Step
export async function executeWorkflowStep(
  state: WorkflowState,
  targetHost: SystemSpecs,
  options: { simulateFailure?: boolean; simulateTimeout?: boolean; autoRemediate?: boolean } = {}
): Promise<WorkflowState> {
  const nextState: WorkflowState = JSON.parse(JSON.stringify(state));
  const startTime = Date.now();

  const addTrace = (agent: string, action: string, status: 'success' | 'warning' | 'error' | 'info', detail: string) => {
    nextState.executionTrace.push({
      timestamp: new Date().toISOString(),
      agent,
      action,
      status,
      detail,
      latencyMs: Date.now() - startTime,
    });
  };

  // 1. Router Agent Step
  if (nextState.currentAgent === 'RouterAgent') {
    addTrace('RouterAgent', 'Intent & Urgency Classification', 'info', `Processing prompt: "${nextState.rawMessage}" with priority ${nextState.urgency.toUpperCase()}`);
    
    if (nextState.intent === 'unrecognized' || !nextState.detectedSoftware) {
      nextState.status = 'failed';
      nextState.currentAgent = 'Complete';
      nextState.statusMessage = 'Request rejected by Security Guardrail: Software is not in approved enterprise catalog.';
      addTrace('RouterAgent', 'Guardrail Rejection', 'error', 'Unapproved or suspicious software blocked from workflow.');
      return nextState;
    }

    if (nextState.intent === 'documentation_query') {
      nextState.currentAgent = 'Complete';
      nextState.status = 'completed';
      nextState.statusMessage = 'RAG Documentation retrieved successfully.';
      addTrace('RouterAgent', 'Route to RAG Knowledge Base', 'success', 'User asked documentation question. Routing to RAG query engine.');
      return nextState;
    }

    // Move to Approval Agent
    nextState.currentAgent = 'ApprovalAgent';
    nextState.status = 'checking_approval';
    nextState.statusMessage = 'Checking enterprise software license and approval requirements.';
    addTrace('RouterAgent', 'Workflow Dispatched', 'success', `Routed to ApprovalAgent for ${nextState.detectedSoftware}`);
    return nextState;
  }

  const pkg = findSoftwareInCatalog(nextState.detectedSoftware || '');
  if (!pkg) {
    nextState.status = 'failed';
    nextState.currentAgent = 'Complete';
    nextState.statusMessage = `Software package "${nextState.detectedSoftware}" not found in enterprise catalog.`;
    return nextState;
  }

  // 2. Approval Agent Step
  if (nextState.currentAgent === 'ApprovalAgent') {
    nextState.approvalRequired = pkg.requiresApproval;
    
    if (pkg.requiresApproval) {
      if (nextState.approvalStatus === 'approved') {
        addTrace('ApprovalAgent', 'Human Sign-off Verified', 'success', `Approved by ${nextState.approvalApprover || 'Manager'}. Proceeding to compatibility check.`);
        nextState.currentAgent = 'CompatibilityAgent';
        nextState.status = 'checking_compatibility';
        nextState.statusMessage = `Approval confirmed. Verifying target machine compatibility...`;
      } else if (nextState.approvalStatus === 'rejected') {
        addTrace('ApprovalAgent', 'Approval Rejected', 'warning', `Request rejected by ${nextState.approvalApprover || 'Approver'}.`);
        nextState.currentAgent = 'Complete';
        nextState.status = 'rejected';
        nextState.statusMessage = `Installation request rejected: ${nextState.approvalNotes || 'Manager denied software license.'}`;
      } else {
        // Pending human approval
        nextState.status = 'waiting_approval';
        nextState.statusMessage = `Requires approval from ${pkg.approvalRole || 'Manager'} (${pkg.licenseType}). Waiting for sign-off.`;
        addTrace('ApprovalAgent', 'Approval Required', 'warning', `Package requires formal sign-off. Pushing Adaptive Card to Teams.`);
      }
    } else {
      // Auto approved
      nextState.approvalStatus = 'auto_approved';
      nextState.status = 'approved';
      addTrace('ApprovalAgent', 'Policy Check', 'success', `${pkg.name} is pre-approved under Enterprise Open Source / Site License.`);
      nextState.currentAgent = 'CompatibilityAgent';
      nextState.status = 'checking_compatibility';
      nextState.statusMessage = `${pkg.name} is pre-approved. Verifying target machine compatibility...`;
    }
    return nextState;
  }

  // 3. Compatibility Agent Step
  if (nextState.currentAgent === 'CompatibilityAgent') {
    nextState.compatibilityChecked = true;
    
    // Check if already installed
    const alreadyInstalled = targetHost.installedSoftware.some(
      s => s.name.toLowerCase().includes(pkg.name.toLowerCase()) || pkg.name.toLowerCase().includes(s.name.toLowerCase())
    );

    if (alreadyInstalled) {
      nextState.isCompatible = false;
      nextState.currentAgent = 'Complete';
      nextState.status = 'completed';
      nextState.statusMessage = `${pkg.name} is already installed on ${targetHost.hostName}. No installation required.`;
      nextState.compatibilityDetails = {
        osMatch: true,
        archMatch: true,
        diskSufficient: true,
        ramSufficient: true,
        missingPrerequisites: [],
        notes: `Software already detected in target registry.`,
      };
      addTrace('CompatibilityAgent', 'Already Installed', 'info', `${pkg.name} found in existing workstation software inventory.`);
      return nextState;
    }

    const osMatch = pkg.supportedOS.includes(targetHost.os);
    const archMatch = pkg.supportedArch.includes(targetHost.arch);
    const diskSufficient = targetHost.availableDiskGB >= pkg.minDiskGB;
    const ramSufficient = targetHost.availableRamGB >= pkg.minRamGB;
    
    let missingPrereqs: string[] = [];
    if (pkg.prerequisites) {
      // If simulateFailure or options require missing prerequisite
      if (options.simulateFailure && pkg.id === 'postgresql') {
        missingPrereqs.push('Microsoft Visual C++ 2015-2022 Redistributable');
      }
    }

    const isCompatible = osMatch && archMatch && diskSufficient && ramSufficient;
    nextState.isCompatible = isCompatible;
    nextState.compatibilityDetails = {
      osMatch,
      archMatch,
      diskSufficient,
      ramSufficient,
      missingPrerequisites: missingPrereqs,
      notes: isCompatible ? 'System satisfies all hardware and OS prerequisites.' : 'Hardware or OS constraints failed.',
    };

    if (!isCompatible) {
      nextState.currentAgent = 'Complete';
      nextState.status = 'incompatible';
      const issues = [];
      if (!osMatch) issues.push(`OS mismatch (${targetHost.os} not supported)`);
      if (!archMatch) issues.push(`Architecture mismatch (${targetHost.arch})`);
      if (!diskSufficient) issues.push(`Insufficient disk (Need ${pkg.minDiskGB} GB, available ${targetHost.availableDiskGB} GB)`);
      if (!ramSufficient) issues.push(`Insufficient RAM (Need ${pkg.minRamGB} GB, available ${targetHost.availableRamGB} GB)`);
      nextState.statusMessage = `Compatibility Check Failed: ${issues.join(', ')}`;
      addTrace('CompatibilityAgent', 'Compatibility Rejection', 'error', nextState.statusMessage);
      return nextState;
    }

    addTrace('CompatibilityAgent', 'System Validated', 'success', `Target host ${targetHost.hostName} (${targetHost.os}, ${targetHost.arch}, ${targetHost.availableDiskGB}GB free) verified.`);
    nextState.currentAgent = 'InstallerAgent';
    nextState.status = 'installing';
    nextState.statusMessage = `Compatibility confirmed. Preparing approved installation tool call...`;
    return nextState;
  }

  // 4. Installer Agent & Tool Calling Step
  if (nextState.currentAgent === 'InstallerAgent') {
    // Determine approved tool based on OS
    let toolName = 'winget';
    let toolCommand = '';

    if (targetHost.os === 'Windows 11') {
      toolName = pkg.vettedTools.windows?.tool || 'winget';
      toolCommand = pkg.vettedTools.windows?.command || `winget install --id ${pkg.id} --silent`;
    } else if (targetHost.os === 'macOS Sequoia') {
      toolName = pkg.vettedTools.mac?.tool || 'brew';
      toolCommand = pkg.vettedTools.mac?.command || `brew install ${pkg.id}`;
    } else {
      toolName = pkg.vettedTools.linux?.tool || 'apt';
      toolCommand = pkg.vettedTools.linux?.command || `sudo apt-get install -y ${pkg.id}`;
    }

    // Security guardrail check on tool and command
    const illegalChars = [';', '&&', '||', '`', '$', '<', '>'];
    const hasInjection = illegalChars.some(char => toolCommand.includes(char) && !toolCommand.includes('sudo apt-get update && sudo'));
    
    if (hasInjection) {
      addTrace('InstallerAgent', 'Guardrail Triggered', 'error', 'Command string contained unauthorized metacharacters. Execution blocked.');
      nextState.status = 'failed';
      nextState.currentAgent = 'Complete';
      nextState.statusMessage = 'Guardrail violation: Unauthorized execution syntax detected.';
      return nextState;
    }

    // Check simulated failure or timeout
    const isTimeout = options.simulateTimeout;
    const isFailure = options.simulateFailure && nextState.retryCount === 0;

    nextState.toolCall = {
      toolName,
      sanitizedArgs: { packageId: pkg.id, version: pkg.latestVersion, silent: true },
      executedCommand: toolCommand,
      guardrailPassed: true,
      executionTimeMs: isTimeout ? 15000 : 1240,
      exitCode: isTimeout ? 143 : (isFailure ? 1603 : 0),
      output: isTimeout 
        ? 'Error: Connection timed out to enterprise CDN repository (15000ms SLA exceeded)'
        : (isFailure 
            ? 'Error 1603: Fatal error during installation. Missing prerequisite: Microsoft Visual C++ 2015-2022 Redistributable.'
            : `Successfully installed ${pkg.name} ${pkg.latestVersion}. Package registration complete.`),
    };

    if (isTimeout || isFailure) {
      addTrace('InstallerAgent', 'Tool Execution Failed', 'error', `Exit Code ${nextState.toolCall.exitCode}: ${nextState.toolCall.output}`);
      nextState.currentAgent = 'TroubleshootingAgent';
      nextState.status = 'troubleshooting';
      nextState.statusMessage = `Installation encountered an issue (Exit Code ${nextState.toolCall.exitCode}). Analyzing remediation playbook...`;
      return nextState;
    }

    addTrace('InstallerAgent', 'Tool Executed', 'success', `Tool [${toolName}] invoked successfully. Package binary written to system.`);
    nextState.currentAgent = 'ValidationAgent';
    nextState.status = 'validating';
    nextState.statusMessage = `Installation executed. ValidationAgent verifying binary health and version...`;
    return nextState;
  }

  // 5. Validation Agent Step
  if (nextState.currentAgent === 'ValidationAgent') {
    const probe = pkg.validationProbe;
    const probeSuccess = true; // In standard flow, probe succeeds
    
    nextState.validationResult = {
      success: probeSuccess,
      checkedVersion: pkg.latestVersion,
      probeOutput: `${probe.command} -> ${pkg.name} ${pkg.latestVersion} (Registry verified, PATH confirmed)`,
      verifiedPath: targetHost.os === 'Windows 11' ? `C:\\Program Files\\${pkg.name}\\bin` : `/usr/local/bin/${pkg.id}`,
    };

    addTrace('ValidationAgent', 'Health Probe Executed', 'success', `Probe: "${probe.command}" returned expected signature "${probe.expectedPattern}". Verified.`);
    nextState.currentAgent = 'Complete';
    nextState.status = 'completed';
    nextState.statusMessage = `Installation of ${pkg.name} ${pkg.latestVersion} validated and operational!`;
    return nextState;
  }

  // 6. Troubleshooting Agent Step
  if (nextState.currentAgent === 'TroubleshootingAgent') {
    const exitCode = nextState.toolCall?.exitCode || 1;
    
    // Check if remediation is possible
    if (exitCode === 1603 && nextState.retryCount < nextState.maxRetries) {
      nextState.retryCount += 1;
      nextState.remediationAttempted = true;
      nextState.remediationAction = 'Auto-deployed prerequisite: Microsoft Visual C++ 2015-2022 Redistributable (vcredist_x64.exe)';
      
      addTrace('TroubleshootingAgent', 'Remediation Applied', 'warning', `Diagnosed Exit Code 1603. Deployed VC++ Runtime prerequisite. Triggering permitted retry #${nextState.retryCount}...`);
      
      nextState.currentAgent = 'InstallerAgent';
      nextState.status = 'remediating';
      nextState.statusMessage = `Prerequisite deployed. Retrying ${pkg.name} installation (Attempt ${nextState.retryCount} of ${nextState.maxRetries})...`;
      return nextState;
    }

    // If timeout or unrecoverable error or retries exhausted -> Escalate to Human IT
    nextState.currentAgent = 'HumanEscalation';
    nextState.status = 'escalated';
    const ticketId = `INC-${Math.floor(100000 + Math.random() * 900000)}`;
    nextState.escalationTicket = {
      ticketId,
      assignedTeam: 'Tier-2 Enterprise Desktop Support',
      summary: `Automated deployment failure for ${pkg.name} on ${targetHost.hostName} (Exit Code ${exitCode})`,
      diagnosticBundle: {
        host: targetHost,
        package: pkg,
        toolCall: nextState.toolCall,
        retries: nextState.retryCount,
        errorOutput: nextState.toolCall?.output,
        timestamp: new Date().toISOString(),
      },
    };

    addTrace('TroubleshootingAgent', 'Escalated to Human IT', 'error', `Automatic remediation failed or exceeded retry limit. Incident ${ticketId} created.`);
    nextState.statusMessage = `Automated installation could not be completed safely. Escalated to Tier-2 IT Support (${ticketId}). An engineer will assist shortly.`;
    nextState.currentAgent = 'Complete';
    return nextState;
  }

  return nextState;
}

// RAG Query Search
export async function performRAGSearch(query: string): Promise<{
  documents: Array<{ doc: typeof ENTERPRISE_RAG_DOCS[0]; score: number }>;
  synthesizedAnswer: string;
}> {
  const qTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const scored = ENTERPRISE_RAG_DOCS.map(doc => {
    let matches = 0;
    const text = (doc.title + ' ' + doc.content + ' ' + doc.tags.join(' ')).toLowerCase();
    for (const t of qTokens) {
      if (text.includes(t)) matches += 1;
    }
    const score = qTokens.length > 0 ? (matches / qTokens.length) * 0.9 + 0.1 : 0.5;
    return { doc, score: Math.min(1.0, score) };
  }).sort((a, b) => b.score - a.score);

  const topDocs = scored.slice(0, 3);
  const contextText = topDocs.map(d => `[${d.doc.title}]\n${d.doc.content}`).join('\n\n');

  // Try Gemini AI synthesis if available
  const ai = getGemini();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the Enterprise IT RAG Assistant.
Answer the user's question concisely using only the context below:

Context:
${contextText}

Question: "${query}"

Provide a clear, authoritative IT answer citing the relevant policy or standard.`,
      });
      if (response.text) {
        return {
          documents: topDocs,
          synthesizedAnswer: response.text,
        };
      }
    } catch (e) {
      console.warn('Gemini RAG synthesis error:', e);
    }
  }

  // Fallback synthesis
  return {
    documents: topDocs,
    synthesizedAnswer: topDocs.length > 0
      ? `According to enterprise documentation (${topDocs[0].doc.title}): ${topDocs[0].doc.content.slice(0, 350)}...`
      : 'No matching enterprise documentation found for this query.',
  };
}
