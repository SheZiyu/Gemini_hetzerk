"""
Main Orchestrator Agent
Coordinates all tools to solve molecular docking tasks
"""
import google.generativeai as genai
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
import json
from datetime import datetime
import uuid

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.config import Config
from src.agents.tools_registry import TOOL_REGISTRY, ToolCategory
from src.agents.memory import AgentMemory, AgentStep
from src.agents import prompts


class OrchestratorAgent:
    """
    Main agent that orchestrates molecular docking workflow
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or Config.GEMINI_API_KEY

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set")

        # Initialize Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(
            model_name=Config.GEMINI_MODEL,
            generation_config={
                "temperature": 0.1,  # Low temperature for consistent decisions
                "max_output_tokens": Config.MAX_TOKENS,
            },
            system_instruction=prompts.SYSTEM_PROMPT
        )

        # Tool registry
        self.tools = TOOL_REGISTRY

        # Memory for current session
        self.memory: Optional[AgentMemory] = None

        print(f"🤖 Orchestrator Agent initialized")
        print(f"   Model: {Config.GEMINI_MODEL}")
        print(f"   Available tools: {len(self.tools.tools)}")

    def run(
        self,
        user_query: str,
        protein_pdb: str,
        ligand_sdf: str,
        max_steps: int = 10,
        save_memory: bool = True
    ) -> Dict[str, Any]:
        """
        Main execution loop

        Args:
            user_query: User's question/request
            protein_pdb: Path to protein PDB
            ligand_sdf: Path to ligand SDF
            max_steps: Maximum number of agent steps
            save_memory: Whether to save reasoning trace

        Returns:
            Final results dictionary
        """

        # Initialize memory
        session_id = str(uuid.uuid4())[:8]
        self.memory = AgentMemory(
            session_id=session_id,
            user_query=user_query,
            start_time=datetime.now()
        )

        print("\n" + "="*70)
        print(f"🚀 STARTING AGENTIC DOCKING SESSION: {session_id}")
        print("="*70)
        print(f"Query: {user_query}")
        print(f"Protein: {protein_pdb}")
        print(f"Ligand: {ligand_sdf}")
        print("="*70 + "\n")

        # Step 1: Create plan
        print("📋 Step 1: Planning...")
        plan = self._create_plan(user_query, protein_pdb, ligand_sdf)
        print(f"   Strategy: {plan['strategy']}")
        print(f"   Estimated time: {plan['estimated_time_seconds']}s")
        print(f"   Steps planned: {len(plan['steps'])}")

        # Step 2: Execute plan
        print("\n⚙️  Step 2: Executing plan...")
        results = self._execute_plan(plan, protein_pdb, ligand_sdf, max_steps)

        # Step 3: Final analysis
        print("\n📊 Step 3: Final analysis...")
        final_answer = self._generate_final_answer(user_query, results)

        self.memory.final_answer = final_answer
        self.memory.total_time = (datetime.now() - self.memory.start_time).total_seconds()

        # Save memory
        if save_memory:
            output_dir = Config.RESULTS_DIR / "agentic_sessions" / session_id
            self.memory.save(output_dir / "memory.json")
            print(f"\n💾 Session saved: {output_dir}")

        print("\n" + "="*70)
        print("✅ SESSION COMPLETE")
        print("="*70)

        return {
            'session_id': session_id,
            'plan': plan,
            'results': results,
            'final_answer': final_answer,
            'reasoning_trace': self.memory.get_reasoning_trace(),
            'total_time': self.memory.total_time
        }

    def _create_plan(
        self,
        user_query: str,
        protein_pdb: str,
        ligand_sdf: str
    ) -> Dict:
        """Agent creates execution plan"""

        # Get tool descriptions
        tools_desc = self.tools.tools_for_llm()

        # Create prompt
        prompt = prompts.PLANNING_PROMPT.format(
            user_query=user_query,
            protein_pdb=protein_pdb,
            ligand_sdf=ligand_sdf,
            tools_description=tools_desc
        )

        # Get plan from Gemini
        response = self.model.generate_content(prompt)

        # Parse JSON plan
        plan = self._extract_json(response.text)

        # Validate plan
        if not plan or 'steps' not in plan:
            # Fallback plan
            plan = {
                'intent': 'Find best binding pose',
                'strategy': 'balanced',
                'steps': [
                    {
                        'step_num': 1,
                        'tool': 'diffdock',
                        'parameters': {
                            'protein_pdb': protein_pdb,
                            'ligand_sdf': ligand_sdf,
                            'num_poses': 40
                        },
                        'reasoning': 'Start with fast ML-based docking'
                    },
                    {
                        'step_num': 2,
                        'tool': 'detailed_scoring',
                        'parameters': {
                            'protein_pdb': protein_pdb
                        },
                        'reasoning': 'Score all poses'
                    },
                    {
                        'step_num': 3,
                        'tool': 'validate_pose',
                        'parameters': {
                            'protein_pdb': protein_pdb
                        },
                        'reasoning': 'Validate top pose'
                    }
                ],
                'success_criteria': ['Top pose has good confidence', 'No geometric issues'],
                'estimated_time_seconds': 300
            }

        return plan

    def _execute_plan(
        self,
        plan: Dict,
        protein_pdb: str,
        ligand_sdf: str,
        max_steps: int
    ) -> Dict:
        """Execute the plan step by step"""

        results = {
            'docking_results': None,
            'scores': None,
            'validation': None,
            'refinement': None
        }

        current_step_num = 0

        for step_info in plan['steps']:
            current_step_num += 1

            if current_step_num > max_steps:
                print(f"⚠️  Max steps ({max_steps}) reached")
                break

            tool_name = step_info['tool']
            parameters = step_info.get('parameters', {})
            reasoning = step_info.get('reasoning', '')

            print(f"\n{'─'*70}")
            print(f"🔧 Executing Step {current_step_num}: {tool_name}")
            print(f"   Reasoning: {reasoning}")

            # Execute tool
            observation, result_data = self._execute_tool(
                tool_name,
                parameters,
                protein_pdb,
                ligand_sdf,
                results
            )

            print(f"   ✅ Observation: {observation[:100]}...")

            # Save to memory
            step = AgentStep(
                step_num=current_step_num,
                timestamp=datetime.now(),
                thought=f"Executing step {current_step_num} of plan",
                action=tool_name,
                action_input=parameters,
                observation=observation,
                reasoning=reasoning
            )
            self.memory.add_step(step)

            # Update results
            if tool_name == 'diffdock':
                results['docking_results'] = result_data
            elif tool_name == 'detailed_scoring':
                results['scores'] = result_data
            elif tool_name == 'validate_pose':
                results['validation'] = result_data

            # Agent decides if results are good or need refinement
            decision = self._make_decision(
                current_step_num,
                plan,
                results,
                observation
            )

            print(f"   💭 Decision: {decision['next_action']}")
            print(f"   🎯 Confidence: {decision['confidence']}%")

            if decision['next_action'] == 'refine_results':
                print(f"   🔄 Refinement needed: {decision.get('reasoning', '')}")
                # Add refinement step
                refinement = self._refine_results(
                    decision.get('specific_concerns', []),
                    results
                )
                results['refinement'] = refinement

            elif decision['next_action'] == 'finish':
                print(f"   ✅ Agent satisfied with results")
                break

        return results

    def _execute_tool(
        self,
        tool_name: str,
        parameters: Dict,
        protein_pdb: str,
        ligand_sdf: str,
        current_results: Dict
    ) -> tuple[str, Any]:
        """Execute a specific tool"""

        # Import tool implementations
        from src.tools.diffdock_tool import execute_diffdock
        from src.tools.scoring_tool import execute_scoring
        from src.tools.validation_tool import execute_validation

        # Execute based on tool name
        if tool_name == 'diffdock':
            result = execute_diffdock(protein_pdb, ligand_sdf, parameters)
            observation = f"Generated {result['num_poses']} poses. Top pose confidence: {result['top_confidence']:.2f}"
            return observation, result

        elif tool_name == 'vina':
            from src.tools.vina_tool import execute_vina
            result = execute_vina(protein_pdb, ligand_sdf, parameters)
            observation = f"Vina generated {result['num_poses']} poses. Top affinity: {result['top_affinity']:.2f} kcal/mol"
            return observation, result

        elif tool_name == 'detailed_scoring':
            # Need poses from previous step
            if current_results.get('docking_results'):
                result = execute_scoring(
                    protein_pdb,
                    current_results['docking_results']['poses'],
                    parameters
                )
                observation = f"Scored {len(result['scores'])} poses. Top composite score: {result['best_score']:.2f}"
                return observation, result
            else:
                return "Error: No poses to score", None

        elif tool_name == 'validate_pose':
            if current_results.get('docking_results'):
                best_pose = current_results['docking_results']['poses'][0]
                result = execute_validation(protein_pdb, best_pose, parameters)
                observation = f"Validation: {result['status']}. {result['summary']}"
                return observation, result
            else:
                return "Error: No pose to validate", None

        else:
            # Tool not implemented yet
            return f"Tool {tool_name} not yet implemented", None

    def _make_decision(
        self,
        current_step: int,
        plan: Dict,
        results: Dict,
        latest_observation: str
    ) -> Dict:
        """Agent decides next action based on current results"""

        # Format results for LLM
        results_summary = self._format_results_summary(results)

        # Create decision prompt
        prompt = prompts.DECISION_PROMPT.format(
            current_step=current_step,
            original_plan=json.dumps(plan, indent=2),
            results_summary=results_summary,
            latest_observation=latest_observation
        )

        # Get decision from Gemini
        response = self.model.generate_content(prompt)
        decision = self._extract_json(response.text)

        # Validate decision
        if not decision or 'next_action' not in decision:
            decision = {
                'evaluation': 'uncertain',
                'confidence': 50,
                'next_action': 'continue_plan',
                'reasoning': 'Fallback decision',
                'specific_concerns': []
            }

        return decision

    def _refine_results(
        self,
        concerns: List[str],
        current_results: Dict
    ) -> Dict:
        """Refine results based on concerns"""

        print(f"\n🔄 Refining results...")
        print(f"   Concerns: {', '.join(concerns)}")

        # Get refinement tools
        refinement_tools = self.tools.list_tools(ToolCategory.REFINEMENT)
        tools_desc = "\n".join([t.to_llm_description() for t in refinement_tools])

        # Create refinement prompt
        prompt = prompts.REFINEMENT_PROMPT.format(
            issue_description=", ".join(concerns),
            current_results=self._format_results_summary(current_results),
            refinement_tools=tools_desc
        )

        response = self.model.generate_content(prompt)
        refinement_plan = self._extract_json(response.text)

        # Execute refinement (simplified for now)
        print(f"   Strategy: {refinement_plan.get('refinement_tool', 'unknown')}")
        print(f"   Expected: {refinement_plan.get('expected_improvement', 'N/A')}")

        return {
            'plan': refinement_plan,
            'executed': False,  # Would execute here
            'concerns_addressed': concerns
        }

    def _generate_final_answer(
        self,
        user_query: str,
        results: Dict
    ) -> str:
        """Generate final comprehensive answer"""

        # Get execution trace
        trace = "\n".join([
            f"Step {s.step_num}: {s.action} - {s.observation[:100]}..."
            for s in self.memory.steps
        ])

        # Format results
        final_results = self._format_results_summary(results)

        # Create final analysis prompt
        prompt = prompts.FINAL_ANALYSIS_PROMPT.format(
            user_query=user_query,
            execution_trace=trace,
            final_results=final_results
        )

        response = self.model.generate_content(prompt)
        return response.text

    def _format_results_summary(self, results: Dict) -> str:
        """Format results for LLM consumption"""

        summary = []

        if results.get('docking_results'):
            docking = results['docking_results']
            summary.append(f"DOCKING RESULTS:")
            summary.append(f"  - Generated {docking.get('num_poses', 0)} poses")
            summary.append(f"  - Top confidence: {docking.get('top_confidence', 'N/A')}")

        if results.get('scores'):
            scores = results['scores']
            summary.append(f"\nSCORING RESULTS:")
            summary.append(f"  - Best composite score: {scores.get('best_score', 'N/A')}")
            summary.append(f"  - Top pose details: {scores.get('top_pose_summary', 'N/A')}")

        if results.get('validation'):
            validation = results['validation']
            summary.append(f"\nVALIDATION:")
            summary.append(f"  - Status: {validation.get('status', 'N/A')}")
            summary.append(f"  - Summary: {validation.get('summary', 'N/A')}")

        return "\n".join(summary)

    def _extract_json(self, text: str) -> Dict:
        """Extract JSON from LLM response"""
        try:
            # Find JSON in markdown code blocks
            if '```json' in text:
                start = text.find('```json') + 7
                end = text.find('```', start)
                json_str = text[start:end].strip()
            elif '```' in text:
                start = text.find('```') + 3
                end = text.find('```', start)
                json_str = text[start:end].strip()
            else:
                # Try to find raw JSON
                start = text.find('{')
                end = text.rfind('}') + 1
                json_str = text[start:end]

            return json.loads(json_str)

        except Exception as e:
            print(f"⚠️  Failed to parse JSON: {e}")
            return {}