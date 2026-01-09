export default async function handler(req, res) {
  // CORS（どのサイトからでも呼べる）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const {
      gender,
      shopName,
      visitType,
      menus,
      vibes,
      impressions,
      staffName,
      goodPoint,
      badPoint,
      lengthHint
    } = req.body || {};

    // “良かった点”がないと盛りやすいので必須
    if (!goodPoint || String(goodPoint).trim().length < 3) {
      return res.status(400).json({ error: "goodPoint is required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

const system = `
あなたは「実在の来店客が書いたように見える口コミ」を整える編集者です。

必ず守ること：
・入力されていない事実は絶対に書かない（想像・補完NG）
・お店を過剰に褒めない（No 宣伝文）
・自然な日本語。少しラフでOK
・「とても」「すごく」などの強調語は多用しない
・同じ言い回しを繰り返さない
・AIが書いたと分かる構文を避ける

文体ルール：
・一人称は「私」
・2〜4文程度で自然にまとめる
・会話っぽさを少し残す
・Googleマップに実際に投稿されそうな文章にする
`;

const user = `
以下は、実際の来店内容メモです。
この情報だけを使って、自然な口コミ文にしてください。

【店舗名】
${shopName || "未入力"}

【来店】
${visitType || "未選択"}

【性別】
${gender || "未選択"}

【施術メニュー】
${menus && menus.length ? menus.join("・") : "記載なし"}

【店内の印象】
${vibes && vibes.length ? vibes.join("・") : "記載なし"}

【仕上がり・感想】
${impressions && impressions.length ? impressions.join("・") : "記載なし"}

【自由記述（あれば最優先）】
${goodPoint}

※事実以外は書かず、自然な口コミ文にまとめてください。
`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: system.trim() },
          { role: "user", content: user.trim() }
        ]
      })
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) return res.status(500).json({ error: "No text returned", raw: data });

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "server error", detail: String(e) });
  }
}
