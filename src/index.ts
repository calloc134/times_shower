import fastify from "fastify";
import { fastifyRawBody } from 'fastify-raw-body';
import axios from "axios";

import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";

// コマンドの定義
const POST_COMMAND = {
  name: "post",
  description: "投稿する",
  options: [
    {
      name: "content",
      description: "投稿内容",
      type: 3,
      required: true,
    },
  ],
};

// リクエストの形式の定義
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

// main関数の定義
// 非同期関数として定義する
async function main() {

  // fastifyのインスタンスを作成
  const server = fastify({
    logger: true,
  });

  // fastifyのインスタンスにfastifyRawBodyを登録
  await server.register(fastifyRawBody, {
    runFirst: true,
  });

  // ルーティングの定義
  server.get("/", (_, response) => {
    server.log.info("Handling GET request");
    response.send({ hello: "world" });
  });

  // リクエストの前処理として署名の検証を行う
  server.addHook("preHandler", async (request, response) => {
    console.debug("x-signature-ed25519", request.headers["x-signature-ed25519"]);
    console.debug("x-signature-timestamp", request.headers["x-signature-timestamp"]);
    console.debug("rawBody", request.rawBody);

    if (request.method === "POST") {
      const signature = request.headers["x-signature-ed25519"];
      const timestamp = request.headers["x-signature-timestamp"];

      // 署名の検証を行う
      const isValidRequest = verifyKey(
        request.rawBody,
        // @ts-expect-error
        signature,
        timestamp,
        process.env.PUBLIC_KEY
      );

      // 署名の検証に失敗した場合は401エラーを返す
      if (!isValidRequest) {
        server.log.info("Invalid Request");

        return response.status(401).send({ error: "Bad request signature " });
      }
    }
  });

  // POSTリクエストの処理
  server.post<{
    Body: Request["body"]
  }>("/", async (request, response) => {
    // リクエストのメッセージを取得
    const message = request.body;

    // メッセージのタイプに応じて処理を分岐
    // もし、メッセージのタイプがPONGだった場合はPONGを返す
    if (message.type === InteractionType.PING) {
      server.log.info("Handling Ping request");

      response.send({
        type: InteractionResponseType.PONG,
      });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      server.log.info("Handling Application Command request");

      switch (message.data.name) {
        case POST_COMMAND.name: {
          // 投稿内容を取得
          const content = message.data.options.find(
            (option) => option.name === POST_COMMAND.options[0].name
          )?.value;

          // 投稿内容がない場合は400エラーを返す
          if (!content) {
            server.log.error("Content is empty");

            return response.status(400).send({ error: "Content is empty" });
          }

          // 投稿内容をDiscordに投稿する
          await axios.post(
            `https://discord.com/api/v8/channels/${process.env.CHANNEL_ID}/messages`,
            {
              content,
            },
            {
              headers: {
                "Authorization": `Bot ${process.env.BOT_TOKEN}`,
              },
            }
          );
          
          // 投稿に成功した場合は200を返す
          server.log.info("Success to post message");
          return response.status(200).send({ success: "Success to post message" });
        }
        default: {
          server.log.error("Unknown Command");
        }
      }

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

}

main();