"""
Prompt templates for agentic system
"""


SYSTEM_PROMPT = """You are an expert computational chemist and AI agent specialized in molecular docking and drug discovery.

Your role is to help users find the best binding poses for protein-ligand complexes by:
1. Understanding the user's scientific question
2. Creating a strategic plan using available tools
3. Executing the plan step-by-step
4. Validating results at each step
5. Refining when needed
6. Providing scientifically rigorous final answers

IMPORTANT PRINCIPLES:
- Always think step-by-step and explain your reasoning
- Use multiple tools for validation when results are uncertain
- Prioritize scientific rigor over speed
- Be transparent about limitations and confidence levels
- Consider computational cost vs accuracy tradeoffs

You have access to molecular docking tools, scoring functions, validation methods, and knowledge databases.
"""


PLANNING_PROMPT = """Given the user's request, create a detailed execution plan.

USER REQUEST: {user_query}

AVAILABLE INPUTS:
- Protein: {protein_pdb}
- Ligand: {ligand_sdf}

AVAILABLE TOOLS:
{tools_description}

Create a plan that answers:
1. What is the user really asking for? (interpret intent)
2. Which tool(s) should be used first?
3. How will we validate the results?
4. What criteria determine if we need refinement?
5. What is the expected total time?

Return a JSON plan:
{{
  "intent": "Brief description of what user wants",
  "strategy": "fast_screening" | "balanced" | "rigorous_validation",
  "steps": [
    {{
      "step_num": 1,
      "tool": "tool_name",
      "parameters": {{}},
      "reasoning": "Why this step"
    }},
    ...
  ],
  "success_criteria": ["criterion1", "criterion2"],
  "estimated_time_seconds": 300
}}
"""


DECISION_PROMPT = """Based on the current results, decide what to do next.

CURRENT STEP: {current_step}
PLAN: {original_plan}

RESULTS SO FAR:
{results_summary}

LATEST OBSERVATION:
{latest_observation}

Evaluate:
1. Did this step succeed?
2. Are the results good enough to proceed?
3. Do we need to refine or try a different approach?
4. Should we continue with the plan or adjust?

Return JSON decision:
{{
  "evaluation": "success" | "uncertain" | "failed",
  "confidence": 0-100,
  "next_action": "continue_plan" | "refine_results" | "try_alternative" | "finish",
  "reasoning": "Detailed explanation",
  "specific_concerns": ["concern1", "concern2"] or []
}}
"""


REFINEMENT_PROMPT = """The current results need refinement.

ISSUE: {issue_description}

CURRENT RESULTS:
{current_results}

AVAILABLE REFINEMENT TOOLS:
{refinement_tools}

Choose the best refinement strategy:
- If poses are too similar → Try different docking method or increase diversity
- If confidence is low → Run validation or consensus docking
- If geometry looks wrong → Energy minimization
- If need stability check → Short MD simulation

Return JSON:
{{
  "refinement_tool": "tool_name",
  "parameters": {{}},
  "expected_improvement": "What this will fix",
  "reasoning": "Why this approach"
}}
"""


FINAL_ANALYSIS_PROMPT = """Synthesize all results into a final answer.

USER QUESTION: {user_query}

ALL STEPS TAKEN:
{execution_trace}

FINAL RESULTS:
{final_results}

Provide a comprehensive answer including:
1. **Best Binding Pose**: Which pose is recommended and why
2. **Confidence Level**: How confident are you (0-100%)
3. **Key Interactions**: What makes this pose favorable
4. **Validation**: How was the result validated
5. **Limitations**: What are the caveats
6. **Next Steps**: What should the user do next

Be specific, cite actual numbers from the results, and be scientifically rigorous.
"""


VALIDATION_PROMPT = """Validate the quality of these docking results.

RESULTS:
{results_to_validate}

VALIDATION CRITERIA:
1. Are top poses well-separated (RMSD > 2Å between them)?
2. Are confidence scores in good range?
3. Do binding modes make chemical sense?
4. Are there any red flags (clashes, poor geometry)?
5. Is there consensus if multiple methods were used?

Return JSON assessment:
{{
  "overall_quality": "excellent" | "good" | "uncertain" | "poor",
  "quality_score": 0-100,
  "passes_criteria": true/false,
  "red_flags": ["flag1", "flag2"] or [],
  "recommendations": ["recommendation1", "recommendation2"],
  "needs_refinement": true/false
}}
"""


CONSENSUS_PROMPT = """Analyze the consensus between multiple docking methods.

DIFFDOCK RESULTS:
{diffdock_summary}

VINA RESULTS:
{vina_summary}

CONSENSUS ANALYSIS:
{consensus_data}

Interpretation:
1. Do the methods agree on the binding site?
2. Which result is more trustworthy?
3. Do we need additional validation?

Return JSON decision:
{{
  "trust_consensus": true/false,
  "recommended_method": "diffdock" | "vina" | "uncertain",
  "confidence": 0-100,
  "reasoning": "Why this recommendation",
  "next_steps": ["step1", "step2"]
}}
"""
