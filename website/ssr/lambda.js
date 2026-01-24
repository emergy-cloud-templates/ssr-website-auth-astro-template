import { handler as ssrHandler } from './dist/server/entry.mjs';

function createRequest(event) {
  console.log('Event received:', event);
  let baseUrl;
  
  if (event.headers?.origin || event.headers?.Origin) {
    // Use the origin header directly - it already includes protocol
    baseUrl = event.headers?.origin || event.headers?.Origin;
  } else if (event.headers?.Referer || event.headers?.referer) {
    // Fallback: extract from referer header
    const referer = event.headers?.Referer || event.headers?.referer;
    const refererUrl = new URL(referer);
    baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
  } else {
    // Last resort fallback
    const protocol = event.headers?.['x-forwarded-proto'] || 
                     event.headers?.['X-Forwarded-Proto'] || 
                     'https';
    baseUrl = `${protocol}://localhost`;
  }
  
  console.log('Using baseUrl:', baseUrl);
  
  const url = new URL(event.path, baseUrl);

  if (event.queryStringParameters) {
    const queryParams = new URLSearchParams(event.queryStringParameters);
    url.search = queryParams.toString();
  }

  // Prepare request options
  const requestOptions = {
    method: event.httpMethod,
    headers: event.headers,
  };

  // Add body for POST, PUT, PATCH requests
  if (event.body && ['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
    requestOptions.body = event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
  }

  const request = new Request(url, requestOptions);

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
        referer: event?.headers?.Referer ||  "unknown",
        from: event?.headers?.From || 'unknown',
        available: response?._body?.includes("Cette formation n'est plus disponible.") ? false : true,
        duration: duration,
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
        referer: event?.headers?.Referer ||  "unknown",
        from: event?.headers?.From || 'unknown',
        available: false,
        duration: duration,
        timestamp: new Date().toISOString(),
      })
    );

    context.fail(error);
  }
};