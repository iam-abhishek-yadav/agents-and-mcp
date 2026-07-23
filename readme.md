## Agents vs Workflows

**AI agents** are programs where LLM outputs control the workflow.

| Concept       | Definition                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Workflows** | Systems where LLMs and tools are orchestrated through predefined code paths                                                  |
| **Agents**    | Systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks |

## Workflow Design Patterns

### 1. Prompt chaining

Decompose a task into sequential sub-tasks. Each step's output feeds the next.

```mermaid
flowchart LR
  I[Input] --> S1[Step 1<br/>LLM]
  S1 --> S2[Step 2<br/>LLM]
  S2 --> S3[Step 3<br/>LLM]
  S3 --> O[Output]
```

**When to use:** Clear multi-stage pipelines (extract → transform → generate).

### 2. Routing

Direct an input into a specialized sub-task so each path owns a single concern.

```mermaid
flowchart TD
  I[Input] --> R{Router LLM}
  R -->|type A| A[Specialist A]
  R -->|type B| B[Specialist B]
  R -->|type C| C[Specialist C]
  A --> O[Output]
  B --> O
  C --> O
```

**When to use:** Classification, triage, or domain-specific handlers.

### 3. Parallelisation

Break work into independent subtasks and run them concurrently, then merge results.

```mermaid
flowchart TD
  I[Input] --> S[Splitter]
  S --> P1[Subtask 1]
  S --> P2[Subtask 2]
  S --> P3[Subtask 3]
  P1 --> M[Merger]
  P2 --> M
  P3 --> M
  M --> O[Output]
```

**When to use:** Independent analyses, multi-source retrieval, batch scoring.

### 4. Orchestrator–worker

An orchestrator LLM dynamically breaks a complex task into subtasks, assigns workers, and combines their results.

```mermaid
flowchart TD
  I[Complex task] --> Orc{Orchestrator LLM}
  Orc -->|plan| W1[Worker 1]
  Orc -->|plan| W2[Worker 2]
  Orc -->|plan| W3[Worker N]
  W1 -.-> Orc
  W2 -.-> Orc
  W3 -.-> Orc
  Orc --> Out[Combined result]
```

**When to use:** Open-ended problems where the subtask structure is not known up front.

### 5. Evaluator–optimizer

One LLM produces output; another validates (and may request revision) until quality criteria are met.

```mermaid
flowchart TD
  I[Input] --> Gen[Generator LLM]
  Gen --> Eval{Evaluator LLM}
  Eval -->|pass| O[Output]
  Eval -.->|fail / feedback| Gen
```

**When to use:** Quality-sensitive generation (code, writing, structured data) with clear success criteria.

## Agents

Agents are **open-ended**: they use feedback loops and have **no fixed path**.

```mermaid
flowchart TD
  G[Goal / user request] --> L{LLM}
  L -->|choose action| T[Tools]
  T -.->|observation| L
  L -->|done| R[Final response]
```

Typical traits:

- Open-ended goals
- Feedback loops (act → observe → decide)
- No fixed control path; the model chooses next steps

---

## Risks of Agent Frameworks

| Risk                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| Unpredictable path   | The sequence of steps can vary run to run                |
| Unpredictable output | Results may be inconsistent or hard to reproduce         |
| Unpredictable cost   | Extra loops and tool calls can inflate token / API spend |

```mermaid
flowchart LR
  A[Agent run] --> P[Path variance]
  A --> O[Output variance]
  A --> C[Cost variance]
```

---

## Mitigation

| Control        | Purpose                                                      |
| -------------- | ------------------------------------------------------------ |
| **Monitor**    | Observe paths, outputs, latency, and cost                    |
| **Guardrails** | Keep agents safe, consistent, and within intended boundaries |

```mermaid
flowchart TD
  A[Agent] --> M[Monitoring]
  A --> G[Guardrails]
  M --> Ops[Alerts / traces / budgets]
  G --> Bounds[Safety · policy · scope limits]
```
