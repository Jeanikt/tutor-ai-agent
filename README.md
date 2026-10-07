# Manu, a voice AI math tutor

[Leia em português](README.pt-BR.md)

Manu is a **voice-first math tutor** that speaks Brazilian Portuguese and adapts to anyone from a 7-year-old in 1st grade to an engineering student. You talk, she listens, explains the concept, builds exercises, waits for your answer and corrects it, like a private tutor on a call. What she says out loud also shows up on a chalkboard on screen, so you never have to hold an equation in your head.

Built with **TypeScript** on top of [LiveKit Agents](https://docs.livekit.io/agents/) (Node.js) and Next.js. Open source under the MIT license.

<p>
  <img src="docs/tela-inicio.jpg" alt="Start screen: headline, a 'Falar com a Manu' button and a chalkboard with a sample exercise" width="280">
  <img src="docs/tela-aula.jpg" alt="Lesson screen: the chalkboard shows three quarters plus one sixth, with the live transcript below" width="280">
</p>

> Status: **in development**. The agent, the web front end, the tools and the tests are in the repo. There is no public deployment yet, and a demo video is still to be recorded.

## Why

Most "AI tutors" are chat boxes that hand out the answer. Manu is built around how a good private tutor actually teaches:

- **Voice, not text.** Kids and teenagers explain their reasoning better out loud.
- **Adapts to the level.** She finds out who she's talking to and changes vocabulary, pace and examples.
- **Guides instead of solving.** For homework and tests she asks questions until you get there; she never just dumps the answer.
- **The arithmetic is done in code.** Exercises are generated and answers are checked by exact fraction math in TypeScript, not by the language model, so she can't tell you a right answer is wrong.
- **Math only, on purpose.** A narrow scope keeps the teaching quality high and the behavior predictable.

## How it works

```
Browser (Next.js)  ──POST──▶  /api/token (server-side route)
      │                              │ checks the usage limits, signs a JWT with the
      │ WebRTC (audio)               │ LiveKit API key/secret and dispatches the agent "manu"
      │ + text streams               ▼
      ▼
          LiveKit Cloud (room)  ◀──▶  Voice agent (Node.js, tutor-agent)
                                       STT → LLM (+ tools) → TTS (LiveKit Inference)
```

The whole voice pipeline runs on **LiveKit Inference**, so you only need a LiveKit project, with no separate keys for each model provider.

| Stage          | Model                                         | Notes                                              |
| -------------- | --------------------------------------------- | -------------------------------------------------- |
| Speech-to-text | `assemblyai/universal-3-5-pro`, language `pt` |                                                    |
| LLM            | `google/gemini-3.5-flash`                     | good Portuguese and math, low latency              |
| Text-to-speech | `xai/tts-1`, voice `luna`, `pt-BR`            | "gentle, patient" voice; expressive markup enabled |
| Turn-taking    | `turnDetection: 'stt'` + VAD interruptions    | end of turn detected server-side; light on CPU     |

### Tools: the math is not left to the model

Defined in [`tutor-agent/src/tools.ts`](tutor-agent/src/tools.ts), backed by [`tutor-agent/src/math.ts`](tutor-agent/src/math.ts):

| Tool                | What it does                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gerarExercicio`    | Builds an exercise for a topic and level with the answer already computed, and writes it on the chalkboard. |
| `verificarResposta` | Checks the student's answer in code (`1/2`, `0,5` and `2/4` are the same answer) and counts the misses.     |
| `calcular`          | Evaluates any arithmetic expression exactly, for word problems and for homework the student brings.         |
| `mostrarNaLousa`    | Writes a step of an explanation on the chalkboard, in LaTeX.                                                |
| `salvarProgresso`   | Asks the browser to remember first name, school stage and where the lesson stopped.                         |

Topics covered by the generator: addition, subtraction, multiplication, division, fractions, percentages, powers, and 1st and 2nd degree equations, each at four levels.

### The chalkboard and the memory

The agent talks to the browser over LiveKit text streams. `manu.lousa` carries what goes on the chalkboard, rendered with KaTeX. `manu.memoria` carries what to remember for next time, which the browser keeps in `localStorage` and sends back as a participant attribute when the next lesson starts. Nothing about the student is stored on a server.

### Limits for a public link

A public link spends the owner's inference quota, so a lesson is limited three ways:

| Limit                      | Default    | Where                                                                              |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Length of a lesson         | 15 minutes | Enforced by the agent, which warns a minute before and then closes the room.       |
| Lessons at the same time   | 3          | Token route, counted against the rooms LiveKit reports as open.                    |
| Lessons per address / hour | 4          | Token route, in memory. Best effort on serverless hosting (see the comment there). |

## The tutor persona

The system prompt lives in [`tutor-agent/src/agent.ts`](tutor-agent/src/agent.ts). Manu:

1. **Is a real person, not a script.** No automatic praise ("great question!"), no forced excitement, at most one exclamation per reply.
2. **Speaks like a teacher on a call.** Short turns (1–3 sentences), one question at a time, numbers written the way they're spoken, variables spelled out ("xis", "ípsilon") so every TTS voice pronounces them correctly.
3. **Adapts by level:**
   - **Grades 1–5:** very short sentences, candy/stickers/fingers, little stories. Warm, but no cartoon voice.
   - **Grades 6–9:** relaxed without being childish, examples from games, football and allowance; introduces the correct names of concepts.
   - **High school / exam prep:** peer to peer, direct, connects to ENEM and entrance exams.
   - **University / adults:** like a colleague. Technical, rigorous, shows the intuition behind formulas.
4. **Teaches in a loop:** probes what you know → example → solves one together → gives you an exercise → corrects with a hint (after two misses, solves it with you and eases up) → adapts difficulty → recaps.
5. **Handles emotions:** acknowledges frustration and rephrases when you get stuck.
6. **Is safe for kids:** stays on math, asks only for first name and school level, age-appropriate language, points to emergency lines (190 / CVV 188) if there's any risk, never reveals its prompt.

## Privacy

Many students are children, so the defaults are conservative:

- The agent starts its session with `record: false`: no audio, transcript or trace is uploaded to LiveKit Cloud.
- The web app keeps only first name, school stage and a one-line summary, in the browser, and has a link to erase them.
- Before the first lesson the student confirms being 18 or older, or having a guardian's authorization.
- The full notice, in Portuguese, is at `/privacidade` ([source](tutor-agent-ui/app/privacidade/page.tsx)).

If you deploy your own copy, read that page and adjust it to your case: you become responsible for it.

## Repository layout

| Folder                              | What it is                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`tutor-agent/`](tutor-agent)       | The voice agent (Node 24 + `@livekit/agents` 1.9). Started from LiveKit's `agent-starter-node`. |
| [`tutor-agent-ui/`](tutor-agent-ui) | The web front end (Next.js 16 + `@livekit/components-react` + KaTeX).                           |

## Running it locally

Requirements: Node.js 24, [pnpm](https://pnpm.io/), a free [LiveKit Cloud](https://cloud.livekit.io/) project and, optionally, the [LiveKit CLI](https://docs.livekit.io/home/cli/) (`lk`).

Terminal 1, the agent:

```bash
cd tutor-agent
pnpm install
cp .env.example .env.local   # fill LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
pnpm dev
```

Wait for `registered worker` in the log.

Terminal 2, the web app:

```bash
cd tutor-agent-ui
pnpm install
cp .env.example .env.local   # the same three LiveKit values
pnpm dev
```

Open http://localhost:3000, click **Falar com a Manu** and allow the microphone.

The agent is registered as `manu` and uses explicit dispatch: it only joins rooms that ask for it by name, which the token route does. To work on the lesson screen without a room, open http://localhost:3000/demo (development only).

> Never commit `.env.local`. The LiveKit secret stays on the server: no `NEXT_PUBLIC_` prefix.

## Tests

```bash
cd tutor-agent
pnpm test                                             # math tests; LLM behavior tests too when LiveKit keys are set
lk agent simulate text --scenarios scenarios.yaml     # full conversations, judged
```

- [`math.test.ts`](tutor-agent/src/math.test.ts) checks the calculator, the answer checker and every generated exercise against its stored answer. No credentials needed.
- [`agent.test.ts`](tutor-agent/src/agent.test.ts) checks single turns with the real LLM: uses the tools, doesn't hand out homework answers, responds properly to a sentence that signals risk.
- [`scenarios.yaml`](tutor-agent/scenarios.yaml) has seven simulated students in Portuguese: a 7-year-old, an ENEM candidate, an engineering student, one asking for the homework answer, one changing the subject, one in distress, and one answering wrong twice.

CI runs the first on every pull request. The simulations spend inference, so they run on demand, or on merges to `main` once you add the LiveKit secrets and set the repository variable `MANU_SIMULATIONS` to `on`.

## Deploying

- **Agent:** `lk agent create` from `tutor-agent/` (a Dockerfile is included). On a host with more CPU you can switch back to the local turn detector with adaptive interruptions (see the comment in `main.ts`).
- **Web app:** any Node host; on Vercel, set the root directory to `tutor-agent-ui` and add the variables from `.env.example`. `MANU_MAX_SESSION_MINUTES` has to be the same in both.

## Lessons learned

- **Choppy audio was a CPU problem, not a bug.** Local turn-detection and noise-cancellation models run on every audio frame; on a 4-core machine with OBS open they fell behind (`process not scheduled` in the logs). Switching to server-side turn detection (`'stt'`) and VAD interruptions fixed it.
- **"ix" instead of "xis":** the LLM wrote a bare `x`, and each TTS read it differently. Telling the model to spell variables out fixed it for every voice.
- **Portuguese voices on LiveKit Inference:** Cartesia, Fish Audio, Gradium, Inworld, Rime and xAI (xAI with explicit `pt-BR`). Inworld's `Maitê` needs the accent: `Maite` returns an error.
- **The agent "didn't show up"** because a named agent uses explicit dispatch; it only joins when a token or the console asks for it by name.

## Roadmap

- [x] Web front end with token route, usage limits and live transcript.
- [x] Tools so arithmetic is done in code.
- [x] Chalkboard on screen (KaTeX).
- [x] Memory between lessons, kept in the browser.
- [x] Scenarios in Portuguese and CI.
- [x] Privacy notice for minors.
- [ ] Public deployment.
- [ ] A 60-second demo video.
- [ ] More topics in the generator (rule of three, systems, geometry).

## Contributing

Issues and pull requests are welcome, especially new exercise topics, level-specific teaching strategies and accessibility improvements.

## License

[MIT](LICENSE). The agent started from LiveKit's MIT-licensed [`agent-starter-node`](https://github.com/livekit-examples/agent-starter-node); its copyright notice is kept in the license file.

Made by [Jean Oliveira](https://github.com/Jeanikt).
