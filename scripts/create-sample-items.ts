/**
 * サンプルメモを作成するスクリプト
 * 実行方法: npx tsx scripts/create-sample-items.ts
 */

const SAMPLE_ITEMS = [
  // Management
  {
    body: "来週のプロジェクトレビュー会議の準備\n- 進捗状況の整理\n- 課題の洗い出し\n- 次期スプリントの計画",
    bucket: "management",
    pinned: false,
  },
  {
    body: "チームメンバーのスケジュール調整\n- 来月のリリースに向けて\n- 各メンバーの稼働状況確認",
    bucket: "management",
    pinned: true,
  },
  {
    body: "Q1の目標設定とKPIの見直し\n- 前四半期の振り返り\n- 新たな目標設定",
    bucket: "management",
    pinned: false,
  },

  // RFA
  {
    body: "ロボットアームの制御アルゴリズム改善\n- 精度向上のためのパラメータ調整\n- テスト結果の分析",
    bucket: "rfa",
    pinned: true,
  },
  {
    body: "RFAプロジェクトの進捗報告書作成\n- 技術的な成果のまとめ\n- 課題と解決策",
    bucket: "rfa",
    pinned: false,
  },
  {
    body: "センサーデータの解析方法について\n- ノイズ除去の手法\n- データ可視化ツールの検討",
    bucket: "rfa",
    pinned: false,
  },

  // CXC
  {
    body: "CXCシステムのアーキテクチャ設計\n- マイクロサービス化の検討\n- スケーラビリティの確保",
    bucket: "cxc",
    pinned: true,
  },
  {
    body: "CXC APIの仕様書更新\n- エンドポイントの追加\n- 認証方式の見直し",
    bucket: "cxc",
    pinned: false,
  },
  {
    body: "CXCプロジェクトの技術スタック選定\n- フレームワークの比較\n- パフォーマンステスト結果",
    bucket: "cxc",
    pinned: false,
  },

  // Paper
  {
    body: "深層学習を用いた画像認識の最新研究\n- Transformerアーキテクチャの応用\n- データ効率の改善手法",
    bucket: "paper",
    pinned: true,
  },
  {
    body: "論文執筆: ロボット学習における強化学習の応用\n- 関連研究の調査\n- 実験設計の検討",
    bucket: "paper",
    pinned: false,
  },
  {
    body: "読書メモ: \"Attention Is All You Need\"\n- Transformerの基本概念\n- 実装時の注意点",
    bucket: "paper",
    pinned: false,
  },

  // Video
  {
    body: "動画企画: 技術解説シリーズ\n- トピックの選定\n- 構成案の作成",
    bucket: "video",
    pinned: true,
  },
  {
    body: "編集テクニック: カラーマッチング\n- 色調補正の方法\n- 使用ツールの比較",
    bucket: "video",
    pinned: false,
  },
  {
    body: "サムネイルデザインのアイデア\n- 視認性の高いレイアウト\n- ブランドカラーの活用",
    bucket: "video",
    pinned: false,
  },

  // Life
  {
    body: "観たい映画リスト\n- インセプション（再視聴）\n- ダークナイト\n- インターステラー",
    bucket: "life",
    pinned: false,
  },
  {
    body: "買いたいものリスト\n- 新しいノイズキャンセリングヘッドフォン\n- スタンディングデスク",
    bucket: "life",
    pinned: true,
  },
  {
    body: "週末の予定\n- カフェで読書\n- ジムで運動\n- 友人との食事",
    bucket: "life",
    pinned: false,
  },

  // Game
  {
    body: "ボードゲーム企画: 協力型パズルゲーム\n- ゲームメカニクスの設計\n- コンポーネントの検討",
    bucket: "game",
    pinned: true,
  },
  {
    body: "ゲームバランス調整のメモ\n- 難易度カーブの見直し\n- プレイテスト結果の反映",
    bucket: "game",
    pinned: false,
  },
  {
    body: "新しいカードゲームのルール案\n- 勝利条件の設定\n- ターン進行の仕組み",
    bucket: "game",
    pinned: false,
  },
];

async function createSampleItems() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  console.log("サンプルメモを作成します...");
  console.log(`API URL: ${baseUrl}/api/items`);

  // 認証が必要な場合は、ブラウザから実行するか、認証トークンを取得する必要があります
  // このスクリプトは開発環境でのみ使用してください

  for (const item of SAMPLE_ITEMS) {
    try {
      const response = await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: item.body,
          bucket: item.bucket,
          pinned: item.pinned,
          source: "script",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`エラー: ${item.bucket} - ${error}`);
        continue;
      }

      const data = await response.json();
      console.log(`✓ 作成成功: ${item.bucket} - ${data.id}`);
    } catch (error) {
      console.error(`エラー: ${item.bucket} -`, error);
    }
  }

  console.log("\nサンプルメモの作成が完了しました！");
}

// 実行
if (require.main === module) {
  createSampleItems().catch(console.error);
}

export { createSampleItems, SAMPLE_ITEMS };

