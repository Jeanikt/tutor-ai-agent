# Manu — a voice AI math tutor

Manu is a **voice-first math tutor** that speaks Brazilian Portuguese and adapts to anyone from a 7-year-old in 1st grade to an engineering student. You talk, she listens, explains the concept, builds exercises, waits for your answer and corrects it — like a private tutor on a call.

Built with **TypeScript** on top of [LiveKit Agents](https://docs.livekit.io/agents/) (Node.js). Open source under the MIT license.

> Status: **in development**. The voice agent works end to end in the LiveKit Agent Console. The web front end is still a scaffold.

---

## Why

Most "AI tutors" are chat boxes that hand out the answer. Manu is built around how a good private tutor actually teaches:

- **Voice, not text.** Kids and teenagers explain their reasoning better out loud.
- **Adapts to the level.** She finds out who she's talking to and changes vocabulary, pace and examples.
- **Guides instead of solving.** For homework and tests she asks questions until you get there; she never just dumps the answer.
- **Math only, on purpose.** A narrow scope keeps the teaching quality high and the behavior predictable.

## How it works

```
Browser (Next.js)  ──token──▶  /api/token (server-side route)
      │                              │ signs a JWT with the LiveKit API key/secret
      │ WebRTC (audio)               │ + dispatches the agent "my-agent"
      ▼                              ▼
          LiveKit Cloud (room)  ◀──▶  Voice agent (Node.js, tutor-agent)
                                       STT → LLM → TTS (LiveKit Inference)
```

The whole voice pipeline runs on **LiveKit Inference**, so you only need a LiveKit project — no separate keys for each model provider.

| Stage | Model | Notes |
|---|---|---|
| Speech-to-text | `assemblyai/universal-3-5-pro`, language `pt` | |
| LLM | `google/gemini-3.5-flash` | good Portuguese and math, low latency |
| Text-to-speech | `xai/tts-1`, voice `luna`, `pt-BR` | "gentle, patient" voice; expressive markup enabled |
| Turn-taking | `turnDetection: 'stt'` + VAD interruptions | end of turn detected server-side; light on CPU |

## The tutor persona

The system prompt lives in [`tutor-agent/src/agent.ts`](tutor-agent/src/agent.ts). Manu:

1. **Is a real person, not a script** — no automatic praise ("great question!"), no forced excitement, at most one exclamation per reply.
2. **Speaks like a teacher on a call** — short turns (1–3 sentences), one question at a time, numbers written the way they're spoken, variables spelled out ("xis", "ípsilon") so every TTS voice pronounces them correctly.
3. **Adapts by level:**
   - **Grades 1–5:** very short sentences, candy/stickers/fingers, little stories — warm, but no cartoon voice.
   - **Grades 6–9:** relaxed without being childish, examples from games, football and allowance; introduces the correct names of concepts.
   - **High school / exam prep:** peer to peer, direct, connects to ENEM and entrance exams.
   - **University / adults:** like a colleague — technical, rigorous, shows the intuition behind formulas.
4. **Teaches in a loop:** probes what you know → example → solves one together → gives you an exercise → corrects with a hint (after two misses, solves it with you and eases up) → adapts difficulty → recaps.
5. **Handles emotions:** acknowledges frustration and rephrases when you get stuck.
6. **Is safe for kids:** stays on math, asks only for first name and school level, age-appropriate language, points to emergency lines (190 / CVV 188) if there's any risk, never reveals its prompt.

## Repository layout

| Folder | What it is |
|---|---|
| [`tutor-agent/`](tutor-agent) | The voice agent (Node 24 + `@livekit/agents` 1.9). Started from LiveKit's `agent-starter-node`. |
| [`tutor-agent-ui/`](tutor-agent-ui) | Web front end (Next.js 16 + `@livekit/components-react`). Currently a scaffold. |

## Running it locally

Requirements: Node.js 24, [pnpm](https://pnpm.io/), a free [LiveKit Cloud](https://cloud.livekit.io/) project and the [LiveKit CLI](https://docs.livekit.io/home/cli/) (`lk`).

```bash
cd tutor-agent
pnpm install
cp .env.example .env.local   # fill LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
pnpm dev                     # or: lk agent dev
```

Wait for `registered worker` in the log, open the **Agent console** link it prints, click **Start** and allow the microphone. The agent is registered as `my-agent`, so it only joins rooms that dispatch it by name (explicit dispatch).

> Never commit `.env.local`. The front end must keep the LiveKit secret on the server (no `NEXT_PUBLIC_` prefix).

## Lessons learned

- **Choppy audio was a CPU problem, not a bug.** Local turn-detection and noise-cancellation models run on every audio frame; on a 4-core machine with OBS open they fell behind (`process not scheduled` in the logs). Switching to server-side turn detection (`'stt'`) and VAD interruptions fixed it. On a stronger host or LiveKit Cloud you can go back to the local turn detector with adaptive interruptions.
- **"ix" instead of "xis":** the LLM wrote a bare `x`, and each TTS read it differently. Telling the model to spell variables out fixed it for every voice.
- **Portuguese voices on LiveKit Inference:** Cartesia, Fish Audio, Gradium, Inworld, Rime and xAI (xAI with explicit `pt-BR`). Inworld's `Maitê` needs the accent — `Maite` returns an error.
- **The agent "didn't show up"** because a named agent uses explicit dispatch; it only joins when a token or the console asks for it by name.

## Roadmap

- [ ] Web front end: `/api/token` route with `AccessToken` + `RoomAgentDispatch`, `<LiveKitRoom>` with mic control.
- [ ] Agent tools (`tool()` + `zod`): `generateExercise` and `checkAnswer`, so arithmetic is done in code, not by the LLM.
- [ ] Behavior tests in `agent.test.ts`.
- [ ] Deploy: agent on LiveKit Cloud (Dockerfile included), front end on Vercel.

## Contributing

Issues and pull requests are welcome — especially new exercise formats, level-specific teaching strategies and accessibility improvements.

## License

[MIT](LICENSE). The agent started from LiveKit's MIT-licensed [`agent-starter-node`](https://github.com/livekit-examples/agent-starter-node); its copyright notice is kept in the license file.

Made by [Jean Oliveira](https://github.com/Jeanikt).
