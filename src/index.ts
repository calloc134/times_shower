import fastify from "fastify";
import { fastifyRawBody } from "fastify-raw-body";

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

// 環境変数CHANNEL_IDSの取得
// 配列形式となっているため、それを配列オブジェクトに変換する
const CHANNEL_IDS = JSON.parse(process.env.CHANNEL_IDS || "[]");

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
    // ヘッダの内容をログとして出力
    server.log.info(
      "x-signature-ed25519",
      request.headers["x-signature-ed25519"]
    );
    server.log.info(
      "x-signature-timestamp",
      request.headers["x-signature-timestamp"]
    );
    server.log.info("rawBody", request.rawBody);

    // 形式がPOSTの場合のみ署名の検証を行う
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

      // 署名の検証に失敗した場合はその時点で401エラーを返す
      if (!isValidRequest) {
        server.log.info("Invalid Request");
        return response.status(401).send({ error: "Bad request signature " });
      }
    }
  });

  // POSTリクエストの処理
  server.post<{
    Body: Request["body"];
  }>("/", async (request, response) => {
    // リクエストのメッセージを取得
    const message = request.body;

    // メッセージのタイプに応じて処理を分岐
    if (message.type === InteractionType.PING) {
      // もし、メッセージのタイプがPONGだった場合はPONGを返す
      server.log.info("Handling Ping request");
      response.send({
        type: InteractionResponseType.PONG,
      });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      // もし、メッセージのタイプがAPPLICATION_COMMANDだった場合はコマンドの処理を行う
      server.log.info("Handling Application Command request");

      // コマンドの種類に応じて処理を分岐
      switch (message.data.name) {
        // もし、コマンドの種類がPOSTだった場合は投稿の処理を行う
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

          // 投稿内容をログとして出力
          server.log.info("Content", content);

          // 複数チャンネルの投稿を行う
          // Promise.allを使って並列処理を行う
          const results = await Promise.all(
            CHANNEL_IDS.map(async (channelId) => {
              // チャンネルIDをログとして出力
              server.log.info("Channel ID", channelId);
              // 投稿内容をDiscordに投稿する
              const result = await fetch(
                `https://discord.com/api/v10/channels/${channelId}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bot ${process.env.BOT_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    content,
                  }),
                }
              );
              server.log.info(result.status);
              server.log.info(await result.json());

              return result;
            })
          );

          // 投稿に失敗した場合は500エラーを返す
          if (results.some((result) => result.status !== 200)) {
            server.log.error("Failed to post message");
            return response
              .status(500)
              .send({ error: "Failed to post message" });
          }

          // 投稿に成功した場合は200を返す
          server.log.info("Success to post message");
          return response.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `投稿しました: ${content}`
            },
          });
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
