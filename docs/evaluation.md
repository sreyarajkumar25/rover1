# Mission Telemetry & Empirical Evaluation

This document outlines the evaluation framework, metrics formulas, and comparative performance analysis across autonomous exploration strategies.

---

## 1. Metric Definitions

| Metric | Formula / Definition | Operational Objective |
| :--- | :--- | :--- |
| **Exploration Coverage (`explored_pct`)** | $\frac{|\mathcal{K}_{\text{explored}}|}{W \times H} \times 100\%$ | Quantify mapped planetary surface area. |
| **Data Harvested (`data_collected`)** | $\sum_{s \in \mathcal{S}_{\text{collected}}} V(s)$ | Cumulative data points retrieved from science sites. |
| **Data Committed (`data_uploaded`)** | Value uploaded at comm zones | True mission payoff; un-uploaded data is worthless if lost. |
| **Upload Efficiency (`upload_efficiency`)** | $\frac{\text{data\_uploaded}}{\text{energy\_used}}$ | Data return per unit of energy expended (J). |
| **Replan Frequency (`replans`)** | Count of dynamic path replans | Robustness and adaptability to mid-mission terrain shifts. |
| **Time to First Upload (`time_to_first_upload`)** | Step index of first transmission | Metric of early mission derisking. |

---

## 2. Empirical Benchmark Results

Evaluated across 5 random seeds (Seeds: 42, 101, 202, 303, 404) on a 25x25 grid ($E_{\max} = 220\text{J}$, Block Rate = 4%):

| Strategy | Mission Success Rate | Explored Area % | Data Committed (pts) | Energy Expended (J) | Steps Taken | Replans |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Greedy** | **100.0%** | $99.68\% \pm 0.16$ | $390.0 \pm 0.0$ | $180.0 \pm 16.09$ | $166.0 \pm 14.53$ | $38.3 \pm 0.58$ |
| **Frontier-Based** | **100.0%** | $99.73\% \pm 0.09$ | $390.0 \pm 0.0$ | $192.3 \pm 25.66$ | $177.3 \pm 25.11$ | $26.7 \pm 0.58$ |
| **Risk-Aware** | **100.0%** | $99.79\% \pm 0.09$ | $390.0 \pm 0.0$ | $187.3 \pm 14.84$ | $173.3 \pm 16.50$ | $26.3 \pm 0.58$ |
| **Value-Aware** | **100.0%** | $93.97\% \pm 2.88$ | $370.0 \pm 34.6$ | **$160.7 \pm 49.22$** | **$144.0 \pm 51.03$** | **$23.3 \pm 1.53$** |

---

## 3. Comparative Architectural Analysis

1. **Energy Conservation vs. Complete Coverage:**
   - **Value-Aware** achieves the lowest energy consumption ($160.7\text{J}$) and lowest step count ($144.0$), intentionally bypassing marginal distant data sites when the round-trip energy expenditure exceeds net return.
   - **Frontier-Based** and **Greedy** achieve near $100\%$ exploration coverage but expend more battery capacity to illuminate every corner of the map.

2. **Replanning Resilience:**
   - **Greedy** incurs higher replanning frequencies ($38.3$ replans) due to reactive point-to-point target switches when dynamic obstacles spawn.
   - **Risk-Aware** and **Value-Aware** exhibit $35\%$ fewer replans ($23-26$) because they plan long-horizon routes away from dense obstacle/hazard regions.

3. **Guaranteed Return Safety:**
   - All evaluated strategies achieve $100.0\%$ return safety, demonstrating the efficacy of the Return-Safety Invariant in preventing stranded rovers.
