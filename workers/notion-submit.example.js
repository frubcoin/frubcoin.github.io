export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
    }

    if (!env.NOTION_API_KEY || !env.NOTION_DATA_SOURCE_ID) {
      return jsonResponse({ ok: false, error: "Missing NOTION_API_KEY or NOTION_DATA_SOURCE_ID" }, 500, corsHeaders);
    }

    const body = await request.json();
    const fields = body.fields || {};

    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2026-03-11"
      },
      body: JSON.stringify({
        parent: {
          type: "data_source_id",
          data_source_id: env.NOTION_DATA_SOURCE_ID
        },
        properties: buildProperties(fields)
      })
    });

    const notionJson = await notionResponse.json();

    if (!notionResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          error: notionJson.message || "Notion request failed",
          details: notionJson
        },
        notionResponse.status,
        corsHeaders
      );
    }

    return jsonResponse(
      {
        ok: true,
        pageId: notionJson.id
      },
      200,
      corsHeaders
    );
  }
};

function buildProperties(fields) {
  const properties = {
    "What product or release are you adding?": {
      title: richTextArray(fields.productName)
    },
    "Which game is it for?": {
      select: fields.resolvedGame ? { name: fields.resolvedGame } : null
    },
    "What type of product is it?": {
      select: fields.resolvedProductType ? { name: fields.resolvedProductType } : null
    },
    "When does it release?": {
      date: fields.releaseDate ? { start: fields.releaseDate } : null
    },
    "How important is this purchase?": {
      select: fields.priority ? { name: fields.priority } : null
    },
    "Where can you pre-order or view it?": {
      url: fields.sourceUrl || null
    },
    "Anything else to remember?": {
      rich_text: richTextArray(fields.notes)
    }
  };

  return properties;
}

function richTextArray(value) {
  if (!value) {
    return [];
  }

  return [
    {
      type: "text",
      text: {
        content: String(value).slice(0, 2000)
      }
    }
  ];
}

function jsonResponse(payload, status, extraHeaders) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json"
      },
      extraHeaders || {}
    )
  });
}
