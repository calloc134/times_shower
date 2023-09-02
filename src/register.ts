const POST_COMMAND = {
  name: "times",
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

const SHOW_CHANNEL_ID_COMMAND = {
  name: "show_channel_id",
  description: "チャンネルIDを表示する",
};

const ADD_CHANNEL_ID_COMMAND = {
  name: "add_channel_id",
  description: "チャンネルIDを追加する",
  options: [
    {
      name: "channel_id",
      description: "チャンネルID",
      type: 3,
      required: true,
    },
  ],
};

const REMOVE_CHANNEL_ID_COMMAND = {
  name: "remove_channel_id",
  description: "チャンネルIDを削除する",
  options: [
    {
      name: "channel_id",
      description: "チャンネルID",
      type: 3,
      required: true,
    },
  ],
};

const main = async () => {

  const APPLICATION_ID = ""
  const BOT_TOKEN = ""

  const result = await fetch(`https://discord.com/api/v8/applications/${APPLICATION_ID}/commands`, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      POST_COMMAND,
      ADD_CHANNEL_ID_COMMAND,
      REMOVE_CHANNEL_ID_COMMAND,
    ])
  });

  // 成功の可否と、レスポンスの内容を表示
  console.log(result.status);
  console.log(await result.json());
};

main();
