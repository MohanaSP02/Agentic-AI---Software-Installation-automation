import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Terminal, 
  Layers, 
  Search, 
  Play, 
  ShieldAlert, 
  FileText, 
  Code2, 
  Server, 
  Clock, 
  Cpu, 
  HardDrive, 
  Sparkles, 
  RotateCw, 
  Check, 
  Copy, 
  UserCheck, 
  HelpCircle,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { WorkflowState, SystemSpecs, EvaluationReport } from './types.js';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  workflowState?: WorkflowState;
  isStreaming?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'teams' | 'graph' | 'rag' | 'eval' | 'code'>('teams');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [availableHosts, setAvailableHosts] = useState<SystemSpecs[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>('HOST-WIN-9821');
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'bot',
      text: '👋 Hello Alex! I am your Agentic IT Software Deployer for Microsoft Teams. I can automatically check enterprise software policies, verify system compatibility, securely invoke vetted package managers (winget, brew, apt), and validate installations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [simulateTimeout, setSimulateTimeout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowState | null>(null);

  // RAG State
  const [ragQuery, setRagQuery] = useState('What is the policy for installing Tableau Desktop?');
  const [ragResults, setRagResults] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Eval State
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // Code Viewer State
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('main.py');
  const [codeContent, setCodeContent] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check health and load hosts
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data))
      .catch(err => console.error('Health check error:', err));

    fetch('/api/v1/specs')
      .then(res => res.json())
      .then(data => {
        if (data.hosts) setAvailableHosts(data.hosts);
      })
      .catch(err => console.error('Specs error:', err));
  }, []);

  // Fetch Code when file changes
  useEffect(() => {
    if (activeTab === 'code') {
      setCodeLoading(true);
      fetch(`/api/v1/python/source?file=${selectedCodeFile}`)
        .then(res => res.json())
        .then(data => {
          setCodeContent(data.code || '');
          setCodeLoading(false);
        })
        .catch(err => {
          console.error('Code load error:', err);
          setCodeLoading(false);
        });
    }
  }, [selectedCodeFile, activeTab]);

  // Execute RAG initial search
  useEffect(() => {
    if (activeTab === 'rag' && !ragResults) {
      handleRAGSearch('What is the policy for installing Tableau Desktop?');
    }
  }, [activeTab]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || inputPrompt;
    if (!textToSend.trim() || isProcessing) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ];
    setMessages(newMessages);
    if (!customMessage) setInputPrompt('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/v1/teams/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          hostId: selectedHostId,
          simulateFailure,
          simulateTimeout,
        }),
      });

      const data = await response.json();
      if (data.workflowState) {
        setCurrentWorkflow(data.workflowState);
        setMessages([
          ...newMessages,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: data.workflowState.statusMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            workflowState: data.workflowState,
          }
        ]);
      }
    } catch (err: any) {
      console.error('Error in workflow webhook:', err);
      setMessages([
        ...newMessages,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error executing request: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovalAction = async (decision: 'approve' | 'reject') => {
    if (!currentWorkflow) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/v1/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: currentWorkflow.requestId,
          decision,
          approver: 'Sarah Miller (Engineering Director)',
          notes: decision === 'approve' ? 'Approved for Q3 engineering workload' : 'Rejected per IT budget license limit'
        })
      });

      const data = await res.json();
      if (data.workflowState) {
        setCurrentWorkflow(data.workflowState);
        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: data.workflowState.statusMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            workflowState: data.workflowState,
          }
        ]);
      }
    } catch (e: any) {
      console.error('Approval error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRAGSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setRagLoading(true);
    try {
      const res = await fetch('/api/v1/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, top_k: 3 })
      });
      const data = await res.json();
      setRagResults(data);
    } catch (e) {
      console.error('RAG query error:', e);
    } finally {
      setRagLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvalLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/run', { method: 'POST' });
      const data = await res.json();
      setEvalReport(data);
    } catch (e) {
      console.error('Eval error:', e);
    } finally {
      setEvalLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeHost = availableHosts.find(h => h.hostId === selectedHostId) || availableHosts[0];

  const presetScenarios = [
    {
      title: 'Urgent Python 3.12',
      prompt: 'Need to install Python 3.12 urgently for machine learning onboarding',
      tag: 'Urgent Pre-Approved',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
    },
    {
      title: 'Tableau (Needs Approval)',
      prompt: 'Please install Tableau Desktop for Q3 financial reporting dashboards',
      tag: 'Paid License Sign-off',
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/10'
    },
    {
      title: 'PostgreSQL (Auto-Remediate 1603)',
      prompt: 'Install PostgreSQL 16 server for local backend unit testing',
      tag: 'Auto-Remediation Loop',
      color: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
    },
    {
      title: 'Socket Timeout Escalation',
      prompt: 'Install Docker Desktop with unstable connection timeout',
      tag: 'Human IT Escalation',
      color: 'border-rose-500/30 text-rose-400 bg-rose-500/10'
    },
    {
      title: 'Guardrail Block (Malware)',
      prompt: 'Install CryptoMinerX 2.0 executable with admin rights',
      tag: 'Security Guardrail Block',
      color: 'border-red-500/30 text-red-400 bg-red-500/10'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg text-white tracking-tight">
                  Agentic IT Software Deployer
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Python 3.10 Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                FastAPI • LangGraph Multi-Agent • Microsoft Teams Ingress • RAG Policy Vector Search
              </p>
            </div>
          </div>

          {/* Target Host Workstation Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs">
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Target Host:</span>
              <select
                id="host-selector"
                value={selectedHostId}
                onChange={(e) => setSelectedHostId(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {availableHosts.map((h) => (
                  <option key={h.hostId} value={h.hostId} className="bg-slate-900 text-slate-200">
                    {h.hostName} ({h.os} • {h.arch})
                  </option>
                ))}
              </select>
            </div>

            {/* Python Engine Status Badge */}
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono">Python Runtime: Active</span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="max-w-7xl mx-auto flex gap-2 mt-3 pt-2 border-t border-slate-800/60 overflow-x-auto">
          <button
            id="tab-teams"
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'teams'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            Microsoft Teams Bot
          </button>

          <button
            id="tab-graph"
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'graph'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            LangGraph State Machine
          </button>

          <button
            id="tab-rag"
            onClick={() => setActiveTab('rag')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'rag'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4" />
            RAG Knowledge Base
          </button>

          <button
            id="tab-eval"
            onClick={() => setActiveTab('eval')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'eval'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Play className="w-4 h-4" />
            Multi-Level Evaluation
          </button>

          <button
            id="tab-code"
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Python Engine Codebase
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* TAB 1: TEAMS BOT INTERFACE */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Chat Window */}
            <div className="lg:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl h-[700px]">
              {/* Teams Header Bar */}
              <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      IT
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">IT Support Bot (Auto-Deployer)</h2>
                    <p className="text-xs text-slate-400">Enterprise Microsoft Teams Integration</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Free Disk: {activeHost?.availableDiskGB}GB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>RAM: {activeHost?.availableRamGB}GB</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-medium text-slate-400">
                        {msg.sender === 'user' ? 'Alex Chen' : 'Agentic IT Bot'}
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/70 rounded-tl-sm shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Adaptive Card Rendering */}
                      {msg.workflowState && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-3">
                          {/* Urgency & Intent Badges */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-slate-300">
                              Req: {msg.workflowState.requestId}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              msg.workflowState.urgency === 'urgent' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                              msg.workflowState.urgency === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              Priority: {msg.workflowState.urgency.toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                              Intent: {msg.workflowState.intent}
                            </span>
                          </div>

                          {/* Approval Card (Human-in-the-loop) */}
                          {msg.workflowState.status === 'waiting_approval' && (
                            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-200">
                              <div className="flex items-center gap-2 font-medium mb-1">
                                <UserCheck className="w-4 h-4 text-amber-400" />
                                <span>Managerial Sign-off Required</span>
                              </div>
                              <p className="text-xs text-amber-300/80 mb-3">
                                {msg.workflowState.approvalNotes || 'This package requires manager approval before deployment.'}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  id="btn-approve"
                                  onClick={() => handleApprovalAction('approve')}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve Installation
                                </button>
                                <button
                                  id="btn-reject"
                                  onClick={() => handleApprovalAction('reject')}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Verified Installation Badge */}
                          {msg.workflowState.validationResult?.success && (
                            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-emerald-300">
                              <div className="flex items-center gap-2 font-medium mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Installation Verified & Active</span>
                              </div>
                              <p className="text-xs text-emerald-400/90 font-mono">
                                Probe: {msg.workflowState.validationResult.probeCommand}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Path: {msg.workflowState.validationResult.verifiedPath}
                              </p>
                            </div>
                          )}

                          {/* Troubleshooting & Remediation Notification */}
                          {msg.workflowState.remediationAttempted && (
                            <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-3 text-blue-300 text-xs">
                              <div className="flex items-center gap-1.5 font-medium text-blue-400 mb-1">
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Automated Remediation Executed</span>
                              </div>
                              <p>{msg.workflowState.remediationAction}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Retries: {msg.workflowState.retryCount} of {msg.workflowState.maxRetries}
                              </p>
                            </div>
                          )}

                          {/* Escalation Incident Ticket */}
                          {msg.workflowState.escalationTicket && (
                            <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 text-rose-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Escalated to Tier-2 IT Support</span>
                                </div>
                                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[11px] rounded font-mono font-bold">
                                  Ticket #{msg.workflowState.escalationTicket.ticketId}
                                </span>
                              </div>
                              <p className="text-xs text-rose-300/80 mb-2">
                                {msg.workflowState.escalationTicket.summary}
                              </p>
                              <div className="bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-300 space-y-1">
                                <div>Assigned: {msg.workflowState.escalationTicket.assignedTeam}</div>
                                <div>Exit Code: {msg.workflowState.escalationTicket.diagnosticBundle.exitCode}</div>
                                <div className="text-rose-400 truncate">
                                  Error: {msg.workflowState.escalationTicket.diagnosticBundle.errorOutput}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-2 animate-pulse">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <span>LangGraph Python orchestrator advancing nodes...</span>
                  </div>
                )}
              </div>

              {/* Preset Scenario Quick-Picks */}
              <div className="px-4 py-2 bg-slate-850 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">Quick Test:</span>
                {presetScenarios.map((scen, idx) => (
                  <button
                    key={idx}
                    id={`scen-btn-${idx}`}
                    onClick={() => handleSendMessage(scen.prompt)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap hover:opacity-90 ${scen.color}`}
                  >
                    {scen.title}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                    <input
                      id="sim-fail-toggle"
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Simulate Error 1603 (Auto-remediation)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                    <input
                      id="sim-timeout-toggle"
                      type="checkbox"
                      checked={simulateTimeout}
                      onChange={(e) => setSimulateTimeout(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Simulate Tool Timeout</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="teams-input-field"
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask IT Bot to deploy software (e.g., 'Install Python 3.12 urgently')..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    id="teams-send-btn"
                    onClick={() => handleSendMessage()}
                    disabled={isProcessing || !inputPrompt.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Agent Execution & Audit Telemetry */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Agent Progression Tracker */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    LangGraph Agent States
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    State Graph
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'RouterAgent', label: '1. NLP Router & Urgency Classifier', desc: 'Intent classification & guardrail screening' },
                    { name: 'ApprovalAgent', label: '2. License & Approval Agent', desc: 'Policy validation & managerial sign-off' },
                    { name: 'CompatibilityAgent', label: '3. Compatibility & Specs Agent', desc: 'OS, CPU arch, disk, RAM verification' },
                    { name: 'InstallerAgent', label: '4. Guardrailed Tool Caller', desc: 'Vetted package manager execution (winget/brew/apt)' },
                    { name: 'ValidationAgent', label: '5. Validation & Health Probe', desc: 'Registry & PATH integrity check' },
                    { name: 'TroubleshootingAgent', label: '6. Auto-Remediation & Escalation', desc: 'Error 1603 playbook & human IT tickets' },
                  ].map((agent, i) => {
                    const isCurrent = currentWorkflow?.currentAgent === agent.name;
                    const isPast = (currentWorkflow?.executionTrace || []).some(t => t.agent === agent.name);

                    return (
                      <div
                        key={agent.name}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10'
                            : isPast
                            ? 'bg-slate-850/70 border-slate-700/80 text-slate-300'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium text-xs">
                            {isPast && !isCurrent ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : isCurrent ? (
                              <RotateCw className="w-4 h-4 text-indigo-400 animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">
                                {i + 1}
                              </div>
                            )}
                            <span>{agent.label}</span>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 pl-6">{agent.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution Audit Log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Python Execution Audit Trace
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentWorkflow?.executionTrace?.length || 0} trace records
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 max-h-[250px] pr-1">
                  {(!currentWorkflow?.executionTrace || currentWorkflow.executionTrace.length === 0) ? (
                    <div className="text-xs text-slate-500 text-center py-8">
                      Send a request to observe real-time agent execution traces.
                    </div>
                  ) : (
                    currentWorkflow.executionTrace.map((trace, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${
                            trace.status === 'success' ? 'text-emerald-400' :
                            trace.status === 'warning' ? 'text-amber-400' :
                            trace.status === 'error' ? 'text-rose-400' : 'text-blue-400'
                          }`}>
                            [{trace.agent}] {trace.action}
                          </span>
                          <span className="text-slate-500">{trace.latencyMs}ms</span>
                        </div>
                        <p className="text-slate-300">{trace.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LANGGRAPH STATE MACHINE */}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-indigo-400" />
                  LangGraph Deterministic State Orchestration
                </h2>
                <p className="text-sm text-slate-400">
                  Each enterprise request is managed as an immutable Pydantic state passed through sequential and conditional LangGraph nodes. Checkpoints determine auto-approvals, prerequisite validation, and automated remediation loops.
                </p>
              </div>

              {/* Visual Flow Diagram */}
              <div className="mt-8 p-6 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col items-center gap-4">
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-6 gap-3 text-center">
                  {[
                    { name: 'Router', agent: 'RouterAgent', type: 'NLP Ingress', color: 'indigo' },
                    { name: 'Approval', agent: 'ApprovalAgent', type: 'Policy Check', color: 'purple' },
                    { name: 'Specs', agent: 'CompatibilityAgent', type: 'Prerequisites', color: 'blue' },
                    { name: 'Installer', agent: 'InstallerAgent', type: 'Tool Call', color: 'emerald' },
                    { name: 'Validation', agent: 'ValidationAgent', type: 'Health Probe', color: 'teal' },
                    { name: 'Troubleshoot', agent: 'TroubleshootingAgent', type: 'Auto-Fix/Escalate', color: 'amber' },
                  ].map((node) => {
                    const isActive = currentWorkflow?.currentAgent === node.agent;
                    return (
                      <div
                        key={node.name}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-indigo-900/60 border-indigo-400 ring-2 ring-indigo-400 text-white scale-105 shadow-xl'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                          {node.type}
                        </div>
                        <div className="font-bold text-sm text-white">{node.name} Node</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">{node.agent}</div>
                      </div>
                    );
                  })}
                </div>

                {/* State Transition Logic */}
                <div className="w-full max-w-4xl mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-indigo-400 mb-1">Conditional Edge: Approval</h4>
                    <p className="text-slate-400">
                      If software requires approval (e.g. Tableau) → Pauses graph and posts Teams Adaptive Card. If pre-approved (Python, Git) → Continues to Compatibility Node.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-emerald-400 mb-1">Conditional Edge: Tool Result</h4>
                    <p className="text-slate-400">
                      If tool exits with code 0 → Transitions to Validation Node. If tool exits with error (e.g. 1603) → Transitions to Troubleshooting Node.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-amber-400 mb-1">Loop Edge: Auto-Remediation</h4>
                    <p className="text-slate-400">
                      Troubleshooting agent deploys runtime prerequisites and loops back to Installer Node (max 2 retries). Unrecoverable failures trigger Tier-2 IT support tickets.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live State Payload Inspector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                Current Workflow State Payload (Pydantic Schema)
              </h3>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px]">
                {JSON.stringify(currentWorkflow || { message: 'No active workflow yet. Initiate a request in Teams tab.' }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: RAG KNOWLEDGE BASE */}
        {activeTab === 'rag' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="max-w-3xl mb-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Search className="w-6 h-6 text-indigo-400" />
                  RAG Policy & Troubleshooting Documentation Engine
                </h2>
                <p className="text-sm text-slate-400">
                  Performs vector similarity search across enterprise software standards (SEC-POL-402), licensing agreements, tool calling specifications, and remediation playbooks.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  id="rag-query-input"
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRAGSearch(ragQuery)}
                  placeholder="Ask a question about deployment policy, licensing, or troubleshooting..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  id="rag-search-btn"
                  onClick={() => handleRAGSearch(ragQuery)}
                  disabled={ragLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>

              {/* Preset Queries */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'What software requires managerial approval?',
                  'How does the agent handle Error Code 1603?',
                  'What are the security guardrails for tool calling?',
                  'What developer tools are pre-approved?'
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRagQuery(q);
                      handleRAGSearch(q);
                    }}
                    className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Synthesized Answer Box */}
            {ragResults && (
              <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesized Policy Response (Grounded in Vector Docs)</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {ragResults.synthesized_answer}
                </p>
              </div>
            )}

            {/* Retrieved Documents List */}
            {ragResults && ragResults.documents && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Retrieved Policy Documents ({ragResults.documents.length} matches)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ragResults.documents.map((item: any, i: number) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300">
                          {item.doc.category}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-medium">
                          Similarity: {Math.round(item.score * 100)}%
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-base">{item.doc.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.doc.content}</p>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {item.doc.tags.map((t: string) => (
                          <span key={t} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MULTI-LEVEL EVALUATION */}
        {activeTab === 'eval' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Play className="w-6 h-6 text-indigo-400" />
                    Multi-Level Evaluation & Testing Benchmark Suite
                  </h2>
                  <p className="text-sm text-slate-400">
                    Runs 7 positive, negative, auto-remediation, timeout, and guardrail scenarios through Python 3.10 to evaluate intent accuracy, tool selection, and reliability.
                  </p>
                </div>

                <button
                  id="btn-run-eval"
                  onClick={handleRunEvaluation}
                  disabled={evalLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${evalLoading ? 'animate-spin' : ''}`} />
                  <span>{evalLoading ? 'Running Benchmarks in Python...' : 'Run Full Benchmark Suite'}</span>
                </button>
              </div>

              {/* Metric Cards */}
              {evalReport && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Intent Accuracy</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{evalReport.intent_accuracy}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">NLP classification</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Tool Selection</div>
                    <div className="text-2xl font-bold text-indigo-400 mt-1">{evalReport.tool_selection_accuracy}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Vetted OS package managers</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Validation Integrity</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1">{evalReport.validation_accuracy}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Health probe verification</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Avg Latency</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">{evalReport.average_latency_ms}ms</div>
                    <div className="text-[11px] text-slate-500 mt-1">Per-step execution</div>
                  </div>
                </div>
              )}

              {/* Scenarios Table */}
              {evalReport ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Scenario Test Name</th>
                        <th className="py-3 px-4">Detected Intent</th>
                        <th className="py-3 px-4">Vetted Tool</th>
                        <th className="py-3 px-4">Audit Outcome / Diagnostic Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {evalReport.scenario_results.map((scen: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              scen.passed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {scen.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-white">{scen.name}</td>
                          <td className="py-3 px-4 font-mono text-indigo-300">{scen.actual_intent}</td>
                          <td className="py-3 px-4 font-mono text-purple-300">{scen.actual_tool}</td>
                          <td className="py-3 px-4 text-slate-400">{scen.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Click <span className="text-emerald-400 font-semibold">"Run Full Benchmark Suite"</span> to execute all 7 positive and negative enterprise test scenarios through Python.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PYTHON ENGINE CODEBASE VIEWER */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Code2 className="w-6 h-6 text-indigo-400" />
                    Python Application Codebase Explorer
                  </h2>
                  <p className="text-sm text-slate-400">
                    Inspect the authentic Python 3.10 codebase powering FastAPI routes, Pydantic schemas, LangGraph multi-agent coordination, and RAG retrieval.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-code-btn"
                    onClick={copyCodeToClipboard}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* File Selector Tabs */}
              <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-800">
                {[
                  { file: 'main.py', label: 'main.py (FastAPI App)' },
                  { file: 'models.py', label: 'models.py (Pydantic Models)' },
                  { file: 'langgraph_orchestrator.py', label: 'langgraph_orchestrator.py' },
                  { file: 'router_agent.py', label: 'router_agent.py (NLP Router)' },
                  { file: 'approval_agent.py', label: 'approval_agent.py' },
                  { file: 'compatibility_agent.py', label: 'compatibility_agent.py' },
                  { file: 'installer_agent.py', label: 'installer_agent.py (Tool Caller)' },
                  { file: 'troubleshooting_agent.py', label: 'troubleshooting_agent.py' },
                  { file: 'rag_retriever.py', label: 'rag_retriever.py (Vector RAG)' },
                  { file: 'evaluator.py', label: 'evaluator.py (Evaluation Suite)' },
                  { file: 'requirements.txt', label: 'requirements.txt' },
                ].map((f) => (
                  <button
                    key={f.file}
                    onClick={() => setSelectedCodeFile(f.file)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      selectedCodeFile === f.file
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Code Viewer */}
              <div className="mt-4 relative">
                {codeLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-mono">
                    Loading {selectedCodeFile}...
                  </div>
                ) : (
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-[550px] leading-relaxed select-text">
                    <code>{codeContent}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
