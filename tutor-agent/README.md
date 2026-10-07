# Manu voice agent

The LiveKit voice agent for Manu, the math tutor. See the [main README](../README.md) for setup and details.

| File             | What it holds                                                          |
| ---------------- | ---------------------------------------------------------------------- |
| `src/main.ts`    | Voice pipeline (STT, TTS, turn-taking), greeting and the lesson limit. |
| `src/agent.ts`   | Manu's persona and teaching rules (the system prompt).                 |
| `src/tools.ts`   | The tools the LLM calls, and the messages sent to the chalkboard.      |
| `src/math.ts`    | Exact fraction math: exercise generator, calculator, answer checker.   |
| `scenarios.yaml` | Simulated students for `lk agent simulate text`.                       |
