import { handler as ssrHandler } from './../dist/server/entry.mjs';

function createRequest(event) {
  console.log('Event received:', event);
  const baseUrl = 'http://localhost'; // Placeholder base URL
  const url = new URL(event.path, baseUrl);

  if (event.queryStringParameters) {
    const queryParams = new URLSearchParams(event.queryStringParameters);
    url.search = queryParams.toString();
  }

  const request = new Request(url, {
    method: event.httpMethod,
    headers: event.headers,
  });

  // Avoid protocol check of http/https in entry.mjs
  request.socket = {};

  return request;
}

function createResponse(context) {
  let status = 200;
  const headers = new Headers();
  let response = new Response(null, { status, headers });
  response.headersSent = false;
  response.bodyChunks = [];

  response.writeHead = (newStatus, newHeaders) => {
    if (!response.headersSent) {
      status = newStatus;
      for (const [header, value] of Object.entries(newHeaders)) {
        headers.set(header, value);
      }
    }
  };

  response.write = (chunk) => {
    response.bodyChunks.push(chunk);
  };

  response.on = () => response;
  response.end = () => {
    try {
      if (!response.headersSent) {
        response.headersSent = true;
        response._body = Buffer.concat(response.bodyChunks).toString();
        context.succeed({
          statusCode: status,
          headers: Object.fromEntries(headers.entries()),
          body: response._body,
        });
      }
    } catch (e) {
      context.fail(e);
    }
  };
  return response;
}

export const handler = async (event, context) => {
  const startTime = Date.now();

  const request = createRequest(event);
  const response = createResponse(context);

  try {
    await ssrHandler(request, response);
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        url: event.path,
        from: event?.headers?.From || 'unknown',
        duration: duration,
        available: response?._body?.includes("Cette formation n'est plus disponible.") ? false : true,
        timestamp: new Date().toISOString(),
      })
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        url: event.path,
        hasError: true,
        from: event?.headers?.From || 'unknown',
        duration: duration,
        timestamp: new Date().toISOString(),
      })
    );

    context.fail(error);
  }
};
