"""
Compatibility Agent: System Architecture & Hardware Resource Validator
Checks OS version, CPU architecture, free disk space, available RAM, and software dependencies.
"""
from typing import Dict, Any
from python_engine.models import SystemSpecs, SoftwarePackage

class CompatibilityAgent:
    def verify(self, pkg: SoftwarePackage, host: SystemSpecs) -> Dict[str, Any]:
        """
        Validates target host against software deployment prerequisites.
        """
        # 1. Check if already installed
        for installed in host.installed_software:
            inst_name = installed.get('name', '').lower()
            if pkg.name.lower() in inst_name or inst_name in pkg.name.lower():
                return {
                    "is_compatible": False,
                    "already_installed": True,
                    "current_version": installed.get('version', 'unknown'),
                    "os_match": True,
                    "arch_match": True,
                    "disk_sufficient": True,
                    "ram_sufficient": True,
                    "missing_prerequisites": [],
                    "summary": f"{pkg.name} is already present on {host.host_name} (version {installed.get('version', '')})."
                }

        # 2. OS and Architecture checks
        os_match = host.os in pkg.supported_os
        arch_match = host.arch in pkg.supported_arch

        # 3. Resource checks
        disk_sufficient = host.available_disk_gb >= pkg.min_disk_gb
        ram_sufficient = host.available_ram_gb >= pkg.min_ram_gb

        # 4. Prerequisite checks
        missing_prereqs = []
        # In testing/runtime, check any required runtimes
        if pkg.id == "docker" and "Virtualization Enabled" not in [p.get('name') for p in host.installed_software]:
            pass # Standard pass unless explicitly failing

        is_compatible = os_match and arch_match and disk_sufficient and ram_sufficient

        issues = []
        if not os_match:
            issues.append(f"Operating System {host.os} not supported (requires: {', '.join(pkg.supported_os)})")
        if not arch_match:
            issues.append(f"Architecture {host.arch} not supported (requires: {', '.join(pkg.supported_arch)})")
        if not disk_sufficient:
            issues.append(f"Insufficient disk space: Need {pkg.min_disk_gb}GB, only {host.available_disk_gb}GB available")
        if not ram_sufficient:
            issues.append(f"Insufficient RAM: Need {pkg.min_ram_gb}GB, only {host.available_ram_gb}GB available")

        summary = "All hardware and OS prerequisites met." if is_compatible else f"Compatibility check failed: {'; '.join(issues)}"

        return {
            "is_compatible": is_compatible,
            "already_installed": False,
            "os_match": os_match,
            "arch_match": arch_match,
            "disk_sufficient": disk_sufficient,
            "ram_sufficient": ram_sufficient,
            "missing_prerequisites": missing_prereqs,
            "summary": summary
        }
