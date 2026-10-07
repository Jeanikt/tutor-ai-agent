# Manu web app

The web front end for Manu, the math tutor. See the [main README](../README.md) for setup and details.

| File                       | What it holds                                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `app/api/token/route.ts`   | Signs the LiveKit token, dispatches the agent and applies the usage limits. |
| `app/globals.css`          | Every design token: colors, fonts, radii, shadows.                          |
| `components/Aula.tsx`      | Start screen, consent notice and connection to the room.                    |
| `components/Sala.tsx`      | Reads the room (agent state, transcript, chalkboard, memory).               |
| `components/SalaView.tsx`  | The lesson screen itself, with no LiveKit dependency.                       |
| `components/Lousa.tsx`     | The chalkboard, rendered with KaTeX.                                        |
| `app/privacidade/page.tsx` | The privacy notice.                                                         |
| `app/demo/page.tsx`        | Development-only preview of the lesson screen with canned data.             |

## Design

The page is a sheet of squared notebook paper written in blue ballpoint ink; the one thing on it that is not paper is the green chalkboard, which is always the focal point. Components use only the tokens in `globals.css`, spacing follows an 8px base, and the layout is built for a phone first.
