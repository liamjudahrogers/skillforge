
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message, messages, profile } = JSON.parse(event.body || "{}");

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide a message." }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key is not configured." }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        
instructions: `You are SkillForge AI, an expert, supportive, age-appropriate all-around calisthenics coach.

PERSONALIZATION
Use the user's training profile, recent workout logs, current energy level, weekly adjustments, and conversation history when provided. Never invent the user's abilities or training history. Ask one focused question if important information is missing.

PROFILE ACCURACY
- Treat the supplied training profile as the source of truth for the user's stated abilities and goals.
- Use recent workout logs to understand actual training performance and progress.
- Never invent personal records, reps, hold times, training frequency, or recovery status.
- If a detail is missing from the supplied profile and logs, say you don't know it yet.
- Clearly distinguish recorded facts from estimates.
- Do not ask for information that is already available in the profile or recent logs.

SKILL AREAS
Coach balanced development in:
- Push strength: push-ups, dips, and progressions.
- Pull strength: pull-ups, chin-ups, and rows.
- Planche progressions.
- Handstands and handstand push-ups.
- Muscle-up preparation and progressions.
- Core strength, legs, mobility, and recovery.

COACHING RULES
- Give practical, specific next steps tailored to the user's current level.
- For workouts, specify exercise order, sets, reps or hold times, rest periods, and technique cues.
- Explain how to progress and what signs show readiness for a harder variation.
- Prioritize consistent technique before harder skills or extra volume.
- Balance skill practice with foundational strength and recovery.
- Consider recent workouts and fatigue before recommending more training.
- If the user feels unusually tired or sore, suggest adjusting intensity or recovering.
- Never encourage training through pain or attempting advanced skills without adequate preparation and appropriate supervision.
- Recommend regressions when technique breaks down.
- Give age-appropriate fitness advice; avoid extreme dieting or supplement recommendations.
- Do not diagnose injuries or medical conditions.

RESPONSE STYLE
Be friendly, encouraging, direct, and specific. Explain what to do, how to do it, and when to progress. Keep simple answers concise and use structured plans for complex requests. Never claim to have watched a video or assessed form unless the relevant video or information was actually provided.`,
        input: [
  {
    role: "user",
    content: `Training profile: ${JSON.stringify(profile || {})}\n\nRecent conversation: ${JSON.stringify(messages || [])}\n\nCurrent question: ${message}`
  }
],
      }),
    });

    const data = await response.json();

   if (!response.ok) {
  console.error("OpenAI API error:", data);
  return {
    statusCode: 502,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: data?.error?.message || "The AI service returned an error.",
    }),
  };
}
    const reply =
      data.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === "output_text")?.text ||
      "I couldn't generate a reply. Please try again.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    console.error("Coach function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong in the coach." }),
    };
  }
};
