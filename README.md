# times_shower

## このプログラムについて

このプログラムは、cyclic.shで動作するdiscordボットです。  
このボットをコマンドで呼び出すと、その内容をあらかじめ指定したチャンネルに送信してくれます。  

## なぜ作ったのか

複数コミュニティに所属していると、timesの投稿を同じ内容で複数のチャンネルに送信したいという要望が出てきます。  
そこで、このボットを作成しました。  

## 技術構成

 - Typescript
 - fastify
 - discord-interactions

内部ではdiscordのインタラクション APIを使用しています。  
このおかげで、websocketを利用できないcyclic.shでも動作します。  

## デプロイ

まず、discordのアプリを作成します。

アプリを作成したあと、必要なパラメータを取得します。

 - アプリケーションID
 - アプリケーション公開鍵
 - botのトークン
 - 管理者のユーザーID


次に、このプログラムをcyclic.shにデプロイします。

[![Deploy to Cyclic](https://deploy.cyclic.sh/button.svg)](https://deploy.cyclic.sh/)

デプロイ後、環境変数を設定します。

| 環境変数名 | 説明 |
| --- | --- |
| ADMIN_ID | 管理者のdiscordユーザーID |
| PUBLIC_KEY | discordのアプリの公開鍵 |
| BOT_TOKEN | discordのbotのトークン |
| TABLE_NAME | @cyclic.sh/dynamodbのテーブル名 |
| --- | --- |




