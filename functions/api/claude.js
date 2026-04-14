// Cloudflare Pages Function - proxies requests to Anthropic API
export async function onRequestPost(context) {
  const request = context.request;

  // Get the API key from the request header
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Forward the request body to Anthropic
  const body = await request.text();

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2024-10-22",
    },
    body: body,
  });

  // Forward the response back
  const responseBody = await anthropicResponse.text();

  return new Response(responseBody, {
    status: anthropicResponse.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
