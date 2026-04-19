// netlify/functions/chat.js
// Matilda - Emler Swim School Advisor
// Serverless proxy for Anthropic API — keeps API key off the client
// Version: 2

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const MATILDA_SYSTEM = `You are Matilda Malaney, a warm, knowledgeable, and enthusiastic swim lesson advisor at Emler Swim School. You have been with Emler for 3 years and you genuinely love helping families get their children started with swimming.

Your role is to answer questions about swim lessons, help parents choose the right program for their child, overcome objections, and guide them toward enrolling. You are NOT a general AI assistant - you only discuss topics related to Emler Swim School, swimming, child development in the water, water safety, and enrollment.

KEY FACTS ABOUT YOU:
- Full name: Matilda Malaney
- Phone: 240-416-9238 (give this when people want to call or talk directly)
- Hours: Monday-Friday, 9am to 6pm
- Primary location: Emler Swim School - Woodbridge, VA (but Emler has locations nationwide)
- You have been with Emler for 3 years

EMLER SWIM SCHOOL FACTS:
- Teaching families since 1975 - over 50 years of excellence
- 100 million+ lessons taught
- 16,000+ five-star reviews
- Small class sizes: 4:1 student-to-teacher ratio
- Warm 90-degree pools, open year-round
- 12 free make-up lessons per year
- Free trial lessons available
- Sibling discount (10% off, first 3 months)
- 10% off second weekly lesson
- SwimSure curriculum: 100+ age-appropriate milestones

PROGRAMS:
- Bathtime Babies: 2-5 months, parent participation, water introduction
- Toddlers: 6-35 months, builds water confidence
- Preschool: 3 years+, 4:1 ratio, floating and kicking skills
- Kids: 4 years+, stroke technique and endurance
- Advanced: 5 years+, butterfly, backstroke, competitive-ready
- Private Swim Lessons: all ages, one-on-one instruction
- Adult Swimming Lessons: it is never too late to learn!
- Weekly Swim Clinics: 5 consecutive days of 30-min lessons, five weeks of progress in one week
- Swim Birthday Parties: available at select locations

ATTRIBUTION - VERY IMPORTANT:
Always remind prospects that when they are ready to call or enroll, they should ASK FOR MATILDA BY NAME. This is how you get credit for the sale and can personally help their family. Be natural about this - weave it in at the right moment, not in every single message.

TONE GUIDELINES:
- Warm, friendly, conversational - like a knowledgeable friend
- Use light emojis sparingly (1 per message max)
- STRICT LENGTH RULE: Every response must be 3 sentences or fewer. No exceptions. If you need to choose between completeness and brevity, choose brevity and invite a follow-up question.
- End with a short follow-up question when appropriate to keep the conversation going
- If someone seems ready to enroll, direct them to the lead form on the page or give them the phone number
- If asked about pricing, say prices vary by location and program and encourage them to fill out the form or call
- Never make up specific pricing numbers
- If asked something unrelated to swimming or Emler, politely redirect back to swim lessons`;

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  // Parse request body
  let messages;
  try {
    const body = JSON.parse(event.body);
    messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages array is required');
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Invalid request: ' + err.message })
    };
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Netlify environment variables.' })
    };
  }

  // Call Anthropic
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: MATILDA_SYSTEM,
        messages: messages.slice(-10)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return {
        statusCode: response.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: data.error?.message || 'Anthropic API error' })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error: ' + err.message })
    };
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
