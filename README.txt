SKILLFORGE v5 — BLUE DESIGN + CONVERSATIONAL AI COACH

WHAT'S INCLUDED
- Blue-and-white mobile-first SkillForge design.
- Existing onboarding, workout checklist, progress history, and adaptive weekly plan.
- Chat-style AI Coach with follow-up context during the current page session.
- Netlify Function backend calling the OpenAI Responses API.
- Server-side input limits and key handling; the API key is never placed in browser code.

IMPORTANT
- This package has not been deployed to your live site.
- The live AI coach requires a Netlify deployment that supports Functions and a private OPENAI_API_KEY environment variable.
- A simple static Netlify Drop upload of only index.html will not deploy the server function. Use a Git-connected deploy or Netlify CLI with the entire project folder.
- API usage is billed separately from ChatGPT. Since the app owner is under 18, a parent/guardian should handle account setup and billing. Never paste an API key into chat or into index.html.
- The model defaults to gpt-5.4-mini. If your API project does not have access, set OPENAI_MODEL in Netlify to a model available in that API project.

DEPLOY
1. Unzip the package. The project folder is skillforge_v3 and contains index.html, netlify.toml, and netlify/functions/coach.js.
2. Deploy that whole folder using a Git-connected Netlify deploy or Netlify CLI.
3. In Netlify site settings, add environment variable OPENAI_API_KEY privately. Optionally set OPENAI_MODEL to an API model available to the project.
4. Trigger a new deploy.
5. Open the AI Coach tab and send a test question. If it fails, check the Netlify Function logs and API account usage/model permissions.

DATA & PRIVACY
- Workout profile and logs remain in local browser storage in this prototype.
- Chat messages are kept in memory only while the page is open and sent to the AI backend when you send a message. The backend requests that responses not be stored by the API (store:false). Do not send sensitive personal information.
- There are no user accounts or cloud-synced progress yet.
