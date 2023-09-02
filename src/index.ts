import fastify from "fastify";
import { fastifyRawBody } from "fastify-raw-body";
import CyclicDb from "@cyclic.sh/dynamodb"

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

type ObjectType = {
  app_permissions: string; // アプリの権限（文字列）
  application_id: string; // アプリケーションのID（文字列）
  channel: {
    flags: number; // チャンネルに関連するフラグ（数値）
    guild_id: string; // ギルド（サーバー）のID（文字列）
    id: string; // チャンネル自体のID（文字列）
    last_message_id: string; // 最後に送信されたメッセージのID（文字列）
    name: string; // チャンネルの名前（文字列）
    nsfw: boolean; // NSFW（Not Safe for Work）かどうか（真偽値）
    parent_id: string; // 親カテゴリのID（文字列）
    permissions: string; // チャンネルの権限（文字列）
    position: number; // チャンネルの位置（数値）
    rate_limit_per_user: number; // ユーザーごとのレート制限（数値）
    topic: null | string; // チャンネルのトピック（nullまたは文字列）
    type: number; // チャンネルのタイプ（数値）
  };
  channel_id: string; // チャンネルのID（文字列）
  data: {
    id: string; // データ項目のID（文字列）
    name: string; // データ項目の名前（文字列）
    options: any[]; // オプション（不明な型の配列）
    type: number; // データ項目のタイプ（数値）
  };
  entitlement_sku_ids: any[]; // エンタイトルメントSKUのID（不明な型の配列）
  entitlements: any[]; // エンタイトルメント（不明な型の配列）
  guild: {
    features: any[]; // ギルド（サーバー）の特徴（不明な型の配列）
    id: string; // ギルド（サーバー）のID（文字列）
    locale: string; // ギルド（サーバー）のロケール（言語設定、文字列）
  };
  guild_id: string; // ギルド（サーバー）のID（文字列）
  guild_locale: string; // ギルド（サーバー）のロケール（言語設定、文字列）
  id: string; // オブジェクト自体のID（文字列）
  locale: string; // ロケール（言語設定、文字列）
  member: {
    avatar: null | string; // メンバーのアバター（nullまたは文字列）
    communication_disabled_until: null | string; // コミュニケーションが無効になる時間（nullまたは文字列）
    deaf: boolean; // メンバーが音声を聞こえない設定か（真偽値）
    flags: number; // メンバーに関するフラグ（数値）
    joined_at: string; // メンバーが参加した時間（文字列）
    mute: boolean; // メンバーがミュートされているか（真偽値）
    nick: null | string; // メンバーのニックネーム（nullまたは文字列）
    pending: boolean; // メンバーの承認が保留中か（真偽値）
    permissions: string; // メンバーの権限（文字列）
    premium_since: null | string; // プレミアム会員になった日（nullまたは文字列）
    roles: any[]; // メンバーの役割（不明な型の配列）
    unusual_dm_activity_until: null | string; // 異常なDM活動が検出されるまでの時間（nullまたは文字列）
    user: {
      avatar: string; // ユーザーのアバター（文字列）
      avatar_decoration_data: null | any; // アバターの装飾データ（nullまたは不明な型）
      discriminator: string; // ユーザーの識別子（文字列）
      global_name: string; // ユーザーのグローバル名（文字列）
      id: string; // ユーザーのID（文字列）
      public_flags: number; // ユーザーに関する公開フラグ（数値）
      username: string; // ユーザー名（文字列）
    };
  };
  token: string; // トークン（文字列）
  type: InteractionType; // オブジェクトのタイプ（数値）
  version: number; // バージョン（数値）
};


// リクエストの形式の定義
type Request = {
  body: ObjectType;
};

// 環境変数CHANNEL_IDSの取得
// カンマ区切りのチャンネルIDを配列に変換する
const CHANNEL_IDS = process.env.CHANNEL_IDS?.split(",") ?? [];

// DBの初期化
const db = CyclicDb("cyclic") as typeof CyclicDb;

// テーブルの定義
const channel_ids = db.collection("channel_ids");

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

          // もし投稿者が指定されたユーザでない場合は400エラーを返す
          if (message.member.user.id !== process.env.USER_ID) {
            server.log.error("User is not allowed");
            return response.status(400).send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `投稿者が不正です`
              },
            });
          }

          // 投稿内容がない場合は400エラーを返す
          if (!content) {
            server.log.error("Content is empty");
            return response.status(400).send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `投稿内容が空です`
              },
            });
          }

          // 複数チャンネルの投稿を行う
          // Promise.allを使って並列処理を行う
          const results = await Promise.all(
            CHANNEL_IDS.map(async (channelId) => {
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
              .send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: `投稿に失敗しました: ${content}`
                },
              });
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
          response.status(400).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `不明なコマンドです`
            },
          });
        }
      }
    } else {
      server.log.error("Unknown Type");

      response.status(400).send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `不明なタイプです`
        },
      });
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
