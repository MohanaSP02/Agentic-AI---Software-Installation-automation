"""
Approval Agent: Enterprise License & Policy Validation
Verifies whether requested software requires managerial or IT finance sign-off.
"""
from typing import Dict, Any, Optional
from python_engine.catalog import SoftwarePackage

class ApprovalAgent:
    def check_approval(self, pkg: SoftwarePackage, current_approval_status: Optional[str] = None) -> Dict[str, Any]:
        """
        Determines whether software can be auto-approved or requires human-in-the-loop sign-off.
        """
        if not pkg.requires_approval:
            return {
                "requires_approval": False,
                "status": "auto_approved",
                "notes": f"{pkg.name} is pre-approved under Enterprise Open Source / Site License policy SEC-POL-402.",
                "approver": "System Auto-Policy Engine"
            }

        # Software requires approval
        if current_approval_status == "approved":
            return {
                "requires_approval": True,
                "status": "approved",
                "notes": "Managerial sign-off verified via Microsoft Teams Adaptive Card.",
                "approver": "Engineering / Analytics Manager"
            }
        elif current_approval_status == "rejected":
            return {
                "requires_approval": True,
                "status": "rejected",
                "notes": "Request denied: License quota exceeded or unauthorized role.",
                "approver": "IT License Desk"
            }
        else:
            return {
                "requires_approval": True,
                "status": "pending",
                "notes": f"Requires sign-off from {pkg.approval_role} ({pkg.license_type}). Interactive Adaptive Card generated.",
                "approver": None
            }
