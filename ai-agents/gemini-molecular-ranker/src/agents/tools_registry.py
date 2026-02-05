"""
Tool Registry for Agentic System
Defines all tools the agent can use
"""
from typing import Dict, Callable, Any, List
from dataclasses import dataclass
from enum import Enum
import json


class ToolCategory(Enum):
    """Categories of tools"""
    STRUCTURE_PREDICTION = "structure_prediction"
    DOCKING = "docking"
    SCORING = "scoring"
    VALIDATION = "validation"
    REFINEMENT = "refinement"
    KNOWLEDGE = "knowledge"
    ANALYSIS = "analysis"


@dataclass
class Tool:
    """Tool definition for the agent"""
    name: str
    description: str
    category: ToolCategory
    parameters: Dict[str, Any]
    function: Callable
    estimated_time: float  # seconds
    requires_gpu: bool = False

    def to_llm_description(self) -> str:
        """Format tool for LLM understanding"""
        params_str = json.dumps(self.parameters, indent=2)
        return f"""
Tool: {self.name}
Category: {self.category.value}
Description: {self.description}
Parameters: {params_str}
Estimated Time: {self.estimated_time}s
Requires GPU: {self.requires_gpu}
"""


class ToolRegistry:
    """Registry of all available tools"""

    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self._register_default_tools()

    def register_tool(self, tool: Tool):
        """Register a new tool"""
        self.tools[tool.name] = tool
        print(f"✅ Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Tool:
        """Get tool by name"""
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found")
        return self.tools[name]

    def list_tools(self, category: ToolCategory = None) -> List[Tool]:
        """List all tools, optionally filtered by category"""
        if category is None:
            return list(self.tools.values())
        return [t for t in self.tools.values() if t.category == category]

    def tools_for_llm(self) -> str:
        """Format all tools for LLM"""
        descriptions = []
        for category in ToolCategory:
            tools_in_cat = self.list_tools(category)
            if tools_in_cat:
                descriptions.append(f"\n{'=' * 60}")
                descriptions.append(f"{category.value.upper()} TOOLS:")
                descriptions.append('=' * 60)
                for tool in tools_in_cat:
                    descriptions.append(tool.to_llm_description())

        return "\n".join(descriptions)

    def _register_default_tools(self):
        """Register default tools"""

        # We'll implement these in the next section
        # This is just the registration

        # DOCKING TOOLS
        self.register_tool(Tool(
            name="diffdock",
            description="ML-based molecular docking. Fast, generates 40 poses. Best for initial screening.",
            category=ToolCategory.DOCKING,
            parameters={
                "protein_pdb": "str - path to protein PDB file",
                "ligand_sdf": "str - path to ligand SDF file or SMILES",
                "num_poses": "int - number of poses to generate (default: 40)",
            },
            function=None,  # Will set later
            estimated_time=180.0,  # 3 minutes
            requires_gpu=True
        ))

        self.register_tool(Tool(
            name="vina",
            description="Physics-based docking with AutoDock Vina. Slower but rigorous. Use for validation or when DiffDock results are uncertain.",
            category=ToolCategory.DOCKING,
            parameters={
                "protein_pdb": "str - protein PDB",
                "ligand_sdf": "str - ligand SDF",
                "exhaustiveness": "int - search effort (default: 8)",
            },
            function=None,
            estimated_time=600.0,
            requires_gpu=False
        ))

        # SCORING TOOLS
        self.register_tool(Tool(
            name="detailed_scoring",
            description="Calculate H-bonds, contacts, shape complementarity, drug-likeness.",
            category=ToolCategory.SCORING,
            parameters={
                "protein_pdb": "str - protein structure",
                "ligand_sdf": "str - ligand pose",
                "include_solvation": "bool - include solvation effects (default: False)",
            },
            function=None,
            estimated_time=5.0,
            requires_gpu=False
        ))

        # VALIDATION TOOLS
        self.register_tool(Tool(
            name="validate_pose",
            description="Check if pose is physically reasonable (no clashes, proper geometry).",
            category=ToolCategory.VALIDATION,
            parameters={
                "protein_pdb": "str - protein",
                "ligand_sdf": "str - pose to validate",
            },
            function=None,
            estimated_time=2.0,
            requires_gpu=False
        ))

        self.register_tool(Tool(
            name="compare_to_known",
            description="Compare pose to known crystal structures (if available).",
            category=ToolCategory.VALIDATION,
            parameters={
                "ligand_sdf": "str - predicted pose",
                "reference_pdb": "str - known structure",
            },
            function=None,
            estimated_time=1.0,
            requires_gpu=False
        ))

        # REFINEMENT TOOLS
        self.register_tool(Tool(
            name="minimize_pose",
            description="Energy minimize the pose to relax geometry.",
            category=ToolCategory.REFINEMENT,
            parameters={
                "protein_pdb": "str - protein",
                "ligand_sdf": "str - pose",
                "force_field": "str - MMFF94 or UFF (default: MMFF94)",
            },
            function=None,
            estimated_time=10.0,
            requires_gpu=False
        ))

        self.register_tool(Tool(
            name="short_md",
            description="Run short MD simulation (1-5ns) to check stability.",
            category=ToolCategory.REFINEMENT,
            parameters={
                "protein_pdb": "str - protein",
                "ligand_sdf": "str - pose",
                "time_ns": "float - simulation time (default: 1.0)",
            },
            function=None,
            estimated_time=300.0,  # 5 minutes for 1ns
            requires_gpu=True
        ))

        # KNOWLEDGE TOOLS
        self.register_tool(Tool(
            name="search_pdb",
            description="Search PDB for similar protein-ligand complexes.",
            category=ToolCategory.KNOWLEDGE,
            parameters={
                "protein_name": "str - protein name or PDB ID",
                "ligand_name": "str - ligand name (optional)",
            },
            function=None,
            estimated_time=5.0,
            requires_gpu=False
        ))

        self.register_tool(Tool(
            name="check_known_interactions",
            description="Look up known critical interactions for this protein family.",
            category=ToolCategory.KNOWLEDGE,
            parameters={
                "protein_family": "str - e.g., 'kinase', 'GPCR', 'protease'",
            },
            function=None,
            estimated_time=2.0,
            requires_gpu=False
        ))


# Global registry instance
TOOL_REGISTRY = ToolRegistry()