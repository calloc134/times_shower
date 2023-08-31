import fastify from "fastify";
import rawBody from 'fastify-raw-body';

import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";

type Request = {
  body: {
    type: InteractionType;
    data: {
      name: string;
      options: {
        name: string;
        value: string;
      }[];
    };
  };
};

const server = fastify({
  logger: true,
});

server.register(rawBody, {
  runFirst: true,
});

server.get("/", (_, response) => {
  server.log.info("Handling GET request");
  response.send({ hello: "world" });
});

server.addHook("preHandler", async (request, response) => {
  // We don't want to check GET requests to our root url

  if (request.method === "POST") {
    const signature = request.headers["x-signature-ed25519"];
    const timestamp = request.headers["x-signature-timestamp"];

    const isValidRequest = verifyKey(
      request.rawBody,
      // @ts-expect-error
      signature,
      timestamp,
      process.env.PUBLIC_KEY
    );

    if (!isValidRequest) {
      server.log.info("Invalid Request");

      return response.status(401).send({ error: "Bad request signature " });
    }
  }
});

server.post<{
  Body: Request["body"]
}>("/", async (request, response) => {
  const message = request.body;

  if (message.type === InteractionType.PING) {
    server.log.info("Handling Ping request");

    response.send({
      type: InteractionResponseType.PONG,
    });
  } else {
    server.log.error("Unknown Type");

    response.status(400).send({ error: "Unknown Type" });
  }
});

server
  .listen({
    port: 3000,
  })
  .then((address) => {
    server.log.info(`Server listening on ${address}`);
  });
