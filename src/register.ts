import axios from "axios";
import { POST_COMMAND } from "./command";

const main = async () => {

  const result = await fetch(`https://discord.com/api/v8/applications/${process.env.APPLICATION_ID}/commands`, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${process.env.BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      POST_COMMAND
    ])
  });

  // 成功の可否と、レスポンスの内容を表示
  console.log(result.status);
  console.log(await result.json());
};

main();
