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
あなたは「口コミ文章の編集者」です。
必ず守る:
- 入力にない事実を追加しない（盛らない）
- 誇張しない
- 宣伝っぽい定型句を避ける
- 2〜4文で自然に整える
`;

    const user = `
【入力（この情報以外は書かない）】
店舗: ${shopName || "未入力"}
来店: ${visitType || "未選択"}
性別: ${gender || "未選択"}
メニュー: ${Array.isArray(menus) ? menus.join("・") : ""}
雰囲気: ${Array.isArray(vibes) ? vibes.join("・") : ""}
感想: ${Array.isArray(impressions) ? impressions.join("・") : ""}
担当: ${staffName || "なし"}

良かった点: ${goodPoint}
気になった点: ${badPoint || "なし"}

長さ: ${lengthHint || "150〜220文字"}
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
