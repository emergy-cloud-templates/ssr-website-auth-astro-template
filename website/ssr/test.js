import { handler as lambdaHandler } from "./lambda-local.js";

const event2 = {
  httpMethod: "GET",
  path: `/`,
  headers: {},
  queryStringParameters: {},
  requestContext: {},
};

const context = {
  succeed: (response) => {
    console.log("Generated HTML for the index page:", response.body);
    return response.body;
  },
  fail: (error) => {
    console.error("Error:", error);
  },
};

export const handler = async (event) => {
  console.log("Event received:", event);
  const res = await lambdaHandler(
    {
      httpMethod: "GET",
      path: event.path,
      queryStringParameters: {}, // Added this line
      headers: {},
      requestContext: {},
    },
    context
  );
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
    },
    body: res._body,
  };

  return response;
};

handler(event2);
