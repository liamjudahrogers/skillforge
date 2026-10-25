
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message } = JSON.parse(event.body || "{}");

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
        instructions:
          "You are SkillForge AI, a supportive calisthenics coach. Give practical, safe, age-appropriate guidance on skills such as planche, handstands, muscle-ups, and front levers. Emphasize good technique, gradual progress, rest, and injury prevention. Ask clarifying questions when needed.",
        input: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "The AI service returned an error." }),
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
