"""
Enterprise Software Catalog and Approved Tool Specifications
Includes vetted command signatures for winget, brew, and apt package managers.
"""
from typing import List, Optional
from python_engine.models import SoftwarePackage

ENTERPRISE_SOFTWARE_CATALOG: List[SoftwarePackage] = [
    SoftwarePackage(
        id='python',
        name='Python',
        aliases=['python', 'python3', 'py', 'python 3.12', 'python 3.11'],
        category='Development',
        latest_version='3.12.4',
        supported_versions=['3.12.4', '3.11.9', '3.10.14'],
        requires_approval=False,
        license_type='Free / Open Source',
        min_disk_gb=2.0,
        min_ram_gb=4.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id Python.Python.3.12 --exact --silent --accept-package-agreements --accept-source-agreements'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install python@3.12'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get update && sudo apt-get install -y python3.12 python3-pip'}
        },
        validation_probe={'command': 'python3 --version', 'expected_pattern': 'Python 3.12'}
    ),
    SoftwarePackage(
        id='vscode',
        name='Visual Studio Code',
        aliases=['vscode', 'vs code', 'visual studio code', 'code'],
        category='Development',
        latest_version='1.93.0',
        supported_versions=['1.93.0'],
        requires_approval=False,
        license_type='Free / Open Source',
        min_disk_gb=3.0,
        min_ram_gb=4.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id Microsoft.VisualStudioCode --exact --silent --accept-package-agreements --accept-source-agreements'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install --cask visual-studio-code'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get install -y code'}
        },
        validation_probe={'command': 'code --version', 'expected_pattern': '1.93'}
    ),
    SoftwarePackage(
        id='git',
        name='Git SCM',
        aliases=['git', 'git scm', 'git cli'],
        category='Development',
        latest_version='2.46.0',
        supported_versions=['2.46.0'],
        requires_approval=False,
        license_type='Free / Open Source',
        min_disk_gb=1.0,
        min_ram_gb=2.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id Git.Git --exact --silent --accept-package-agreements --accept-source-agreements'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install git'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get install -y git'}
        },
        validation_probe={'command': 'git --version', 'expected_pattern': 'git version 2.'}
    ),
    SoftwarePackage(
        id='docker',
        name='Docker Desktop',
        aliases=['docker', 'docker desktop', 'docker engine'],
        category='DevOps',
        latest_version='4.33.1',
        supported_versions=['4.33.1'],
        requires_approval=False,
        license_type='Enterprise Site License',
        min_disk_gb=10.0,
        min_ram_gb=8.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        prerequisites=['Virtualization Enabled', 'WSL2 Kernel'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id Docker.DockerDesktop --exact --silent --accept-package-agreements --accept-source-agreements'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install --cask docker'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get install -y docker-ce docker-ce-cli containerd.io'}
        },
        validation_probe={'command': 'docker --version', 'expected_pattern': 'Docker version 27.'}
    ),
    SoftwarePackage(
        id='nodejs',
        name='Node.js LTS',
        aliases=['node', 'nodejs', 'node.js', 'npm'],
        category='Development',
        latest_version='22.8.0',
        supported_versions=['22.8.0', '20.17.0'],
        requires_approval=False,
        license_type='Free / Open Source',
        min_disk_gb=2.0,
        min_ram_gb=4.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install node@22'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get install -y nodejs'}
        },
        validation_probe={'command': 'node --version', 'expected_pattern': 'v22.'}
    ),
    SoftwarePackage(
        id='intellij',
        name='IntelliJ IDEA Ultimate',
        aliases=['intellij', 'idea', 'intellij ultimate', 'intellij idea'],
        category='Development',
        latest_version='2024.2.1',
        supported_versions=['2024.2.1'],
        requires_approval=True,
        approval_role='Engineering Manager & License Admin',
        license_type='Per-Seat Paid',
        min_disk_gb=6.0,
        min_ram_gb=8.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id JetBrains.IntelliJIDEA.Ultimate --exact --silent'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install --cask intellij-idea'},
            'Ubuntu 24.04 LTS': {'tool': 'snap', 'command': 'sudo snap install intellij-idea-ultimate --classic'}
        },
        validation_probe={'command': 'idea --version', 'expected_pattern': 'IntelliJ IDEA 2024.2'}
    ),
    SoftwarePackage(
        id='tableau',
        name='Tableau Desktop',
        aliases=['tableau', 'tableau desktop', 'tableau bi'],
        category='Productivity',
        latest_version='2024.2',
        supported_versions=['2024.2'],
        requires_approval=True,
        approval_role='Analytics Director & IT Finance',
        license_type='Per-Seat Paid',
        min_disk_gb=8.0,
        min_ram_gb=8.0,
        supported_os=['Windows 11', 'macOS Sequoia'],
        supported_arch=['x64'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id Tableau.TableauDesktop --exact --silent'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install --cask tableau'}
        },
        validation_probe={'command': 'tableau --version', 'expected_pattern': 'Tableau 2024.2'}
    ),
    SoftwarePackage(
        id='postgresql',
        name='PostgreSQL Server & Tools',
        aliases=['postgres', 'postgresql', 'psql'],
        category='Database',
        latest_version='16.4',
        supported_versions=['16.4'],
        requires_approval=False,
        license_type='Free / Open Source',
        min_disk_gb=5.0,
        min_ram_gb=4.0,
        supported_os=['Windows 11', 'macOS Sequoia', 'Ubuntu 24.04 LTS'],
        supported_arch=['x64', 'arm64'],
        prerequisites=['Microsoft Visual C++ 2015-2022 Redistributable'],
        vetted_tools={
            'Windows 11': {'tool': 'winget', 'command': 'winget install --id PostgreSQL.PostgreSQL.16 --exact --silent'},
            'macOS Sequoia': {'tool': 'brew', 'command': 'brew install postgresql@16'},
            'Ubuntu 24.04 LTS': {'tool': 'apt', 'command': 'sudo apt-get install -y postgresql-16'}
        },
        validation_probe={'command': 'psql --version', 'expected_pattern': 'psql (PostgreSQL) 16.'}
    ),
]

def find_software(query: str) -> Optional[SoftwarePackage]:
    query_clean = query.lower().strip()
    for pkg in ENTERPRISE_SOFTWARE_CATALOG:
        if pkg.name.lower() == query_clean:
            return pkg
        for alias in pkg.aliases:
            if alias.lower() in query_clean or query_clean in alias.lower():
                return pkg
    return None
