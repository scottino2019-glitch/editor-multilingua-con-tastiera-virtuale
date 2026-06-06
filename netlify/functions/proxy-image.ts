import { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const imageUrl = event.queryStringParameters?.url;
  if (!imageUrl) {
    return {
      statusCode: 400,
      body: "Missing url parameter",
    };
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error("Proxy image Netlify error:", error);
    return {
      statusCode: 500,
      body: "Error proxying image",
    };
  }
};

export { handler };
