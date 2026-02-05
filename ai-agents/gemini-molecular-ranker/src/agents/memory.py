"""
Agent Memory System
Stores decisions, results, and reasoning traces
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path


@dataclass
class AgentStep:
    """Single step in agent execution"""
    step_num: int
    timestamp: datetime
    thought: str  # What the agent is thinking
    action: str  # Tool name to use
    action_input: Dict[str, Any]  # Parameters
    observation: str  # Result from tool
    reasoning: str  # Why agent made this decision

    def to_dict(self) -> Dict:
        return {
            'step_num': self.step_num,
            'timestamp': self.timestamp.isoformat(),
            'thought': self.thought,
            'action': self.action,
            'action_input': self.action_input,
            'observation': self.observation,
            'reasoning': self.reasoning
        }


@dataclass
class AgentMemory:
    """Memory for agent execution"""
    session_id: str
    user_query: str
    start_time: datetime = field(default_factory=datetime.now)
    steps: List[AgentStep] = field(default_factory=list)
    final_answer: Optional[str] = None
    total_time: Optional[float] = None

    def add_step(self, step: AgentStep):
        """Add a step to memory"""
        self.steps.append(step)

    def get_reasoning_trace(self) -> str:
        """Get full reasoning trace as text"""
        trace = [f"Session: {self.session_id}"]
        trace.append(f"Query: {self.user_query}")
        trace.append(f"Started: {self.start_time.isoformat()}")
        trace.append("\n" + "=" * 70)

        for step in self.steps:
            trace.append(f"\nSTEP {step.step_num}:")
            trace.append(f"Thought: {step.thought}")
            trace.append(f"Action: {step.action}")
            trace.append(f"Input: {json.dumps(step.action_input, indent=2)}")
            trace.append(f"Observation: {step.observation}")
            trace.append(f"Reasoning: {step.reasoning}")
            trace.append("-" * 70)

        if self.final_answer:
            trace.append(f"\nFINAL ANSWER:")
            trace.append(self.final_answer)

        return "\n".join(trace)

    def save(self, output_path: Path):
        """Save memory to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        memory_dict = {
            'session_id': self.session_id,
            'user_query': self.user_query,
            'start_time': self.start_time.isoformat(),
            'steps': [s.to_dict() for s in self.steps],
            'final_answer': self.final_answer,
            'total_time': self.total_time
        }

        with open(output_path, 'w') as f:
            json.dump(memory_dict, f, indent=2)

        # Also save human-readable trace
        trace_path = output_path.parent / f"{self.session_id}_trace.txt"
        with open(trace_path, 'w') as f:
            f.write(self.get_reasoning_trace())