
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

    if (action !== "chat" && action !== "generate_plan") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid action." }),
      };
    }

    if (
      action === "chat" &&
      (typeof message !== "string" || !message.trim())
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Please provide a message." }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API key is not configured." }),
      };
    }

    const instructions = `You are SkillForge AI, a supportive, age-appropriate calisthenics coach.

PERSONALIZATION
Use the user's actual profile, workout logs, energy, weekly adjustments, and conversation history when available.

PROFILE ACCURACY
- Treat the supplied profile as the source of truth for stated abilities and goals.
- Never invent personal records, reps, hold times, equipment, or recovery status.
- Do not ask for information already supplied.
- If information is missing, make conservative choices without pretending it is known.

EQUIPMENT RULES
- Only prescribe exercises the user can do with their stated equipment.
- Never assume access to a gym, pull-up bar, rings, resistance bands, weights, or other equipment unless the profile confirms it.
- For bodyweight-only training, use genuinely equipment-free exercises and progressions.
- Do not suggest household furniture or unstable objects as workout equipment.
- If a needed movement requires unavailable equipment, choose an appropriate alternative.
- Respect the user's reported abilities. Wanting to learn a muscle-up, planche, handstand, or handstand push-up does not mean the user can perform it yet.
- For skills the user cannot yet perform, provide suitable foundational exercises and progressions.

GOAL AND DIFFICULTY
- Prioritize the user's stated goal and skill priority.
- Match exercise difficulty and volume to the user's experience and reported abilities.
- If the user reports zero pull-ups or dips, do not prescribe full repetitions as though they can already perform them.
- Include balanced pushing, pulling, legs, core, mobility, and skill practice as appropriate to the user's goals and equipment.
- Do not force every category into every session if that would make the plan unbalanced.

COACHING AND SAFETY
- Include exercise order, sets, reps or hold times, rest, and useful technique cues.
- Prioritize good technique, gradual progression, and recovery.
- Consider recent training, fatigue, energy, and the weekly adjustment.
- Do not encourage training through pain or attempting advanced skills without adequate preparation.
- Give age-appropriate fitness advice.
- Do not diagnose injuries or medical conditions.
- Keep recommendations practical and specific.

PLAN GENERATION
When action is "generate_plan":
- Generate the actual personalized weekly plan, not advice about making one.
- Use the onboarding profile, including goal, experience, training days, equipment, priorities, pull-up ability, dip ability, and recovery.
- Generate exactly the requested number of training sessions when the profile specifies a valid training-day count.
- Treat training days as workout sessions, not necessarily consecutive calendar days.
- Schedule demanding work to allow adequate recovery.
- Use recent logs, energy, and weekly adjustments to modify the plan sensibly.
- Every exercise must include a non-empty name, sets from 1 to 10, reps or hold duration, restSeconds from 0 to 600, and a concise cues string.
- restSeconds must be a number. sets must be a number.
- Return ONLY valid JSON, with no Markdown fences or extra commentary.
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

Follow all equipment, ability, goal, recovery, and session-count rules. Return the actual plan using the required JSON structure.`
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
          Authorization: \`Bearer \${apiKey}\`,
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
          error: "The AI service returned an error. Please try again.",
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
            error: "The coach generated an invalid plan. Please try again.",
          }),
        };
      }

      const requestedDays = Number.parseInt(profile.days, 10);

      const validPlan =
        generated &&
        Array.isArray(generated.plan) &&
        generated.plan.length > 0 &&
        (
          !Number.isInteger(requestedDays) ||
          generated.plan.length === requestedDays
        ) &&
        generated.plan.every(
          (day) =>
            day &&
            typeof day.day === "string" &&
            typeof day.name === "string" &&
            typeof day.focus === "string" &&
            Array.isArray(day.exercises) &&
            day.exercises.length > 0 &&
            day.exercises.every(
              (exercise) =>
                exercise &&
                typeof exercise.name === "string" &&
                exercise.name.trim().length > 0 &&
                Number.isInteger(Number(exercise.sets)) &&
                Number(exercise.sets) >= 1 &&
                Number(exercise.sets) <= 10 &&
                (
                  typeof exercise.reps === "string" ||
                  typeof exercise.reps === "number"
                ) &&
                String(exercise.reps).trim().length > 0 &&
                Number.isFinite(Number(exercise.restSeconds)) &&
                Number(exercise.restSeconds) >= 0 &&
                Number(exercise.restSeconds) <= 600 &&
                typeof exercise.cues === "string" &&
                exercise.cues.trim().length > 0
            )
        );

      if (!validPlan) {
        return {
          statusCode: 502,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error:
              "The coach returned an incomplete plan or the wrong number of sessions. Please try again.",
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
