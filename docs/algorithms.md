# Planning, Pathfinding, and Safety Algorithms

This document provides formal mathematical definitions and algorithmic specifications for the autonomous rover system.

---

## 1. Energy-Weighted A* Pathfinding

The rover navigates a grid with varying traversal costs. Pathfinding uses the $A^*$ algorithm with an energy-weighted edge cost function and an admissible Manhattan distance heuristic.

### Evaluation Function
$$f(n) = g(n) + h(n)$$

Where:
- $g(n)$ is the cumulative energy consumed to reach node $n$ from the start node:
  $$g(n) = g(\text{parent}) + c(\text{parent}, n)$$
- Edge traversal cost $c(u, v)$ depends on cell type:
  $$c(u, v) = \begin{cases}
  1 & \text{if cell is OPEN, COMM\_ZONE, or DATA\_SITE} \\
  c_{\text{hazard}} \cdot \mu_{\text{risk}} & \text{if cell is HAZARD} \\
  c_{\text{unknown}} & \text{if cell is UNKNOWN (when optimistic search enabled)} \\
  \infty & \text{if cell is OBSTACLE (impassable)}
  \end{cases}$$
- $h(n)$ is the scaled Manhattan distance heuristic to goal $G = (x_g, y_g)$:
  $$h(n) = (|x_n - x_g| + |y_n - y_g|) \cdot c_{\min}$$
  Since $c_{\min} \le c(u, v)$ for all passable edges, $h(n)$ is admissible and consistent, guaranteeing an optimal minimum-energy path.

---

## 2. Return-Safety Invariant

To ensure the rover is never stranded in the void without power, the return-safety rule is evaluated at every simulation step.

### Safety Condition
$$\text{IsSafe} = E_{\text{remaining}} > C_{\text{return}}(P_{\text{rover}} \to \text{Comm}^*) + M_{\text{safety}}$$

Where:
- $E_{\text{remaining}}$ is the rover's current battery capacity.
- $\text{Comm}^* = \arg\min_{C \in \mathcal{K}_{\text{comm}}} \text{cost}(P_{\text{rover}} \to C)$ is the closest reachable communication zone on known terrain.
- $C_{\text{return}}$ is the minimal energy path cost computed by $A^*$.
- $M_{\text{safety}}$ is the safety buffer.

### State Transition Trigger
If $\text{IsSafe} = \text{False}$, the rover is forcefully transitioned from `EXPLORING` or `COLLECTING` to `RETURNING` mode. All speculative exploration targets are dropped, and the planned route is locked onto the nearest communication zone.

---

## 3. Exploration Strategy Formulations

### A. Greedy Strategy
Navigates towards the closest uncollected data site, falling back to the nearest frontier:
$$\text{Target} = \arg\min_{T \in \mathcal{D}_{\text{uncollected}} \cup \mathcal{F}} C(P_{\text{rover}} \to T)$$

### B. Frontier-Based Strategy (Information Gain Maximization)
Evaluates candidate frontier cells $\mathcal{F}$ to maximize expected new map knowledge per energy expenditure:
$$\text{Score}(F) = \frac{I(F)}{C(P_{\text{rover}} \to F) + \epsilon}$$
Where:
- $I(F) = |\{ (x, y) \mid \text{dist}(F, (x, y)) \le R_{\text{sensor}} \land \text{known\_map}[y][x] = \text{null} \}|$ is the number of unobserved cells within sensor radius $R$.
- $C(P_{\text{rover}} \to F)$ is the $A^*$ energy path cost.
- $\epsilon = 1.0$ prevents division by zero.

### C. Risk-Aware Strategy (Adaptive Safety Buffer)
Employs a dynamic buffer scaling with hazard density and distance from base:
$$M_{\text{adaptive}} = M_{\text{base}} + \lfloor 0.15 \cdot C_{\text{return}} \rfloor + N_{\text{local\_hazards}}$$
Furthermore, edges traversing known hazards are penalized with $\mu_{\text{risk}} = 3.0$, steering routes away from dangerous terrain.

### D. Value-Aware Strategy (ROI Net Utility)
Computes the expected return on energy investment (ROI) for each known data site $S$:
$$\text{ROI}(S) = \frac{V(S)}{C(P_{\text{rover}} \to S) + C(S \to \text{Comm}^*) + c_{\text{collect}} + c_{\text{upload}}}$$
Subject to the feasibility constraint:
$$E_{\text{remaining}} \ge C(P_{\text{rover}} \to S) + C(S \to \text{Comm}^*) + c_{\text{collect}} + c_{\text{upload}} + M_{\text{safety}}$$
Only sites with positive net return and feasible round-trip budgets are pursued.

---

## 4. Cellular Automata Terrain Generation

Natural terrain structures (caves, rock fields, craters) are synthesized using a 2D cellular automata rule:
1. Initialize cells randomly as obstacles with probability $p = \text{obstacle\_density}$.
2. Perform 2 smoothing iterations with the 4-5 rule:
   $$\text{Cell}^{(t+1)}(x, y) = \begin{cases}
   1 & \text{if } \sum_{i=-1}^1 \sum_{j=-1}^1 \text{Cell}^{(t)}(x+i, y+j) \ge 5 \\
   0 & \text{otherwise}
   \end{cases}$$
3. Execute BFS reachability validation: if any data site or comm zone is disconnected from $(x_{\text{start}}, y_{\text{start}})$, carve an open passage directly connecting the disconnected component to the main traversable graph.
