"""
Installer Agent: Guardrailed Tool Calling Engine
Dispatches vetted package managers (winget, brew, apt) without executing arbitrary shell strings.
"""
from typing import Dict, Any
from python_engine.models import SystemSpecs, SoftwarePackage

FORBIDDEN_METACHARS = [';', '&&', '||', '`', '$', '<', '>', '|', '\n']

class InstallerAgent:
    def prepare_and_execute_tool(
        self, 
        pkg: SoftwarePackage, 
        host: SystemSpecs, 
        simulate_failure: bool = False, 
        simulate_timeout: bool = False
    ) -> Dict[str, Any]:
        """
        Selects vetted tool for host OS, sanitizes parameters, verifies guardrails,
        and simulates safe tool invocation.
        """
        # Determine vetted tool
        vetted_entry = pkg.vetted_tools.get(host.os)
        if not vetted_entry:
            # Fallback to default by OS type
            if "Windows" in host.os:
                tool_name = "winget"
                command = f"winget install --id {pkg.id} --exact --silent"
            elif "macOS" in host.os:
                tool_name = "brew"
                command = f"brew install {pkg.id}"
            else:
                tool_name = "apt"
                command = f"sudo apt-get install -y {pkg.id}"
        else:
            tool_name = vetted_entry['tool']
            command = vetted_entry['command']

        # Guardrail Validation: Check for injection characters
        # Note: Allow standard safe compound for debian update if curated
        check_cmd = command.replace("sudo apt-get update && sudo ", "")
        has_injection = any(char in check_cmd for char in FORBIDDEN_METACHARS)

        if has_injection:
            return {
                "tool_name": tool_name,
                "sanitized_args": {"package_id": pkg.id, "silent": True},
                "executed_command": "[BLOCKED_BY_GUARDRAIL]",
                "guardrail_passed": False,
                "execution_time_ms": 25,
                "exit_code": 126,
                "output": "Execution halted by Security Guardrail: Command contained unauthorized metacharacters or script injection."
            }

        # Simulated Tool Invocation
        if simulate_timeout:
            return {
                "tool_name": tool_name,
                "sanitized_args": {"package_id": pkg.id, "silent": True, "timeout": "15s"},
                "executed_command": command,
                "guardrail_passed": True,
                "execution_time_ms": 15000,
                "exit_code": 143,
                "output": f"TimeoutException: Tool '{tool_name}' exceeded maximum SLA threshold of 15000ms while contacting package repository."
            }

        if simulate_failure:
            return {
                "tool_name": tool_name,
                "sanitized_args": {"package_id": pkg.id, "silent": True},
                "executed_command": command,
                "guardrail_passed": True,
                "execution_time_ms": 2400,
                "exit_code": 1603,
                "output": f"Exit Code 1603: Fatal error during installation of {pkg.name}. Prerequisite runtime 'Microsoft Visual C++ 2015-2022' is missing or unconfigured."
            }

        # Successful tool call
        return {
            "tool_name": tool_name,
            "sanitized_args": {"package_id": pkg.id, "version": pkg.latest_version, "silent": True},
            "executed_command": command,
            "guardrail_passed": True,
            "execution_time_ms": 1350,
            "exit_code": 0,
            "output": f"Successfully verified package signature and installed {pkg.name} {pkg.latest_version} via {tool_name}. System environment PATH updated."
        }
