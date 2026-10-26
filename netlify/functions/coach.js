
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const {
      message = "",
      profile = {},
      messages = [],
      action = "chat",
      recentLogs = [],
      energy = "normal",
      weekAdjustment = "steady",
    } = JSON.parse(event.body || "{}");

    if (
      action !== "chat" &&
      action !== "generate_plan"
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid action." }),
      };
    }

    if (
      action === "chat" &&
      (!message || typeof message !== "string")
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Please provide a message.",
        }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "API key is not configured.",
        }),
      };
    }

    const instructions = `You are SkillForge AI, an expert, supportive, age-appropriate all-around calisthenics coach.

PERSONALIZATION
Use the user's actual training profile, recent workout logs, energy level, weekly adjustments, and conversation history when available.

PROFILE ACCURACY
- Treat the supplied profile as the source of truth for stated abilities and goals.
- Never invent personal records, reps, hold times, training frequency, equipment, or recovery status.
- Do not ask for information already supplied in the profile or logs.
- If information is missing, make conservative programming choices without claiming the user has an ability they have not confirmed.

SKILL AREAS
Coach balanced development in:
- Push-ups, dips, and pushing strength.
- Pull-ups, chin-ups, and rows.
- Planche progressions.
- Handstands and handstand push-ups.
- Muscle-up preparation.
- Core, legs, mobility, and recovery.

COACHING RULES
- Give practical, specific advice tailored to the user's level.
- Include exercise order, sets, reps or hold times, rest, and technique cues.
- Explain how to progress safely.
- Prioritize technique, foundational strength, and recovery.
- Consider recent training and fatigue.
- Never encourage training through pain or attempting advanced skills without adequate preparation.
- Give age-appropriate fitness advice.
- Do not diagnose injuries or medical conditions.

PLAN GENERATION
When action is "generate_plan":
- Generate an actual personalized training plan, not advice about how to make one.
- Use the user's survey profile, including goal, experience level, training days, equipment, priorities, and stated abilities.
- Generate exactly the requested number of training sessions per week when the profile specifies a training-day count.
- If the profile does not specify training days, choose a conservative schedule appropriate to the available information.
- Use only exercises that can be performed with the stated equipment, or clearly identify any necessary alternative.
- Include skill practice, strength, core, legs, mobility, and recovery as appropriate to the user's goals.
- Give each exercise a name, sets, reps or hold duration, rest time in seconds, and a concise technique cue.
- Schedule demanding work to allow adequate recovery.
- Never assume a user can perform a skill merely because they want to learn it.
- Return ONLY valid JSON. Do not wrap it in Markdown fences.
- Use this exact structure:
{
  "plan": [
    {
      "day": "Day 1",
      "name": "Session name",
      "focus": "Session focus",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "6-8",
          "restSeconds": 90,
          "cues": "Technique cue"
        }
      ]
    }
  ]
}

RESPONSE STYLE
Be friendly, encouraging, direct, and specific. Never claim to have assessed a video or observed form unless the relevant information was actually provided.`;

    const userContent =
      action === "generate_plan"
        ? `Generate my personalized weekly calisthenics plan now.

Training profile from the onboarding survey:
${JSON.stringify(profile)}

Recent workout logs:
${JSON.stringify(recentLogs)}

Current energy: ${JSON.stringify(energy)}
Weekly adjustment: ${JSON.stringify(weekAdjustment)}

Generate the actual plan using the required JSON structure.`
        : `Training profile:
${JSON.stringify(profile)}

Recent workout logs:
${JSON.stringify(recentLogs)}

Current energy: ${JSON.stringify(energy)}
Weekly adjustment: ${JSON.stringify(weekAdjustment)}

Recent conversation:
${JSON.stringify(
  Array.isArray(messages) ? messages.slice(-8) : []
)}

Current question:
${message}`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions,
          input: [
            {
              role: "user",
              content: userContent,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error:
            data?.error?.message ||
            "The AI service returned an error.",
        }),
      };
    }

    const outputText =
      data.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === "output_text")
        ?.text || "";

    if (!outputText.trim()) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "The AI returned an empty response.",
        }),
      };
    }

    if (action === "generate_plan") {
      let generated;

      try {
        generated = JSON.parse(outputText);
      } catch {
        console.error("Invalid plan JSON returned by AI.");

        return {
          statusCode: 502,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error:
              "The coach generated an invalid plan. Please try again.",
          }),
        };
      }

      if (
        !generated ||
        !Array.isArray(generated.plan) ||
        generated.plan.length === 0 ||
        !generated.plan.every(
          (day) =>
            day &&
            typeof day.day === "string" &&
            typeof day.name === "string" &&
            Array.isArray(day.exercises)
        )
      ) {
        return {
          statusCode: 502,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error:
              "The coach returned an incomplete plan. Please try again.",
          }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: generated.plan,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply: outputText.trim(),
      }),
    };
  } catch (error) {
    console.error("Coach function error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Something went wrong in the coach.",
      }),
    };
  }
};
