# Career Cabinet

就活の企業情報、マイページのログイン情報、ES・面接メモ、添付資料を企業ごとに管理するブラウザアプリです。

## 現在の構成

- `index.html`：画面構造
- `style.css`：レスポンシブデザイン
- `app.js`：企業登録、検索、メモ、添付、JSON入出力
- 保存先：ブラウザの `localStorage`

## ローカルで確認する

`index.html` をブラウザで開いてください。ビルドツールは不要です。

## Vercel / Neon で複数端末から使う

この構成は Vercel Functions と Neon PostgreSQL に対応しています。

### 1. Neon の準備

1. Neon でプロジェクトを作成
2. SQL Editor で `schema.sql` の内容を実行
3. Neon の接続文字列（`DATABASE_URL`）をコピー

### 2. Vercel の環境変数

Vercel の Project Settings > Environment Variables に次の2つを登録します。

```text
DATABASE_URL=Neonの接続文字列
JWT_SECRET=十分に長いランダムな文字列
```

`DATABASE_URL` や実際の `.env` ファイルは GitHub に保存しないでください。

### 3. 再デプロイ

GitHub の `main` ブランチへ push すると Vercel が自動デプロイします。初回アクセス時に「アカウント登録」から自分のメールアドレスと8文字以上のパスワードを登録してください。同じアカウントで別端末からログインすると企業情報を共有できます。

### セキュリティ上の注意

企業のマイページパスワードを扱うため、Vercel の公開URLは自分だけで使い、GitHub リポジトリも Private に変更することを推奨します。アプリ側ではログインパスワードを bcrypt でハッシュ化し、企業のマイページパスワードは現在データベース内の JSON として保存されます。さらに安全性を高める場合は、企業パスワードの暗号化キー管理を追加してください。
