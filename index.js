const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// =============================
// TELEGRAM WEBHOOK
// =============================
app.post("/telegram", async (req, res) => {

  const message = req.body.message;

  if (message) {

    const chatId = message.chat.id;
    const text = message.text;

    if (text && text.startsWith("/start")) {

      try {

        const payment = await axios.post(
          "https://api.nowpayments.io/v1/invoice",
          {
            price_amount: 40,
            price_currency: "usd",

            order_id: String(chatId),
            order_description: "annual_vip_access"
          },
          {
            headers: {
              "x-api-key": NOWPAYMENTS_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        const invoiceUrl = payment.data.invoice_url;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `💎 VIP ACCESS 💎

🔥 Special offer: 40 USD

━━━━━━━━━━━━━━━━━━
🔞 Exclusive content  
🔒 Private channel access  
📅 Valid for 12 months  
━━━━━━━━━━━━━━━━━━

Pay securely here:

${invoiceUrl}

⚠️ After payment your access will be sent automatically.`
        });

      } catch (error) {
        console.error("Invoice error:", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});


// =============================
// NOWPAYMENTS WEBHOOK
// =============================
app.post("/payment", async (req, res) => {

  const payment = req.body;

  if (payment.payment_status === "finished" && payment.price_amount >= 40) {

    const userId = payment.order_id;

    try {

      const oneYear = 365 * 24 * 60 * 60;
      const expireDate = Math.floor(Date.now() / 1000) + oneYear;

      const invite = await axios.post(
        `${TELEGRAM_API}/createChatInviteLink`,
        {
          chat_id: CHANNEL_ID,
          member_limit: 1,
          expire_date: expireDate
        }
      );

      const inviteLink = invite.data.result.invite_link;

      await axios.post(
        `${TELEGRAM_API}/sendMessage`,
        {
          chat_id: userId,
          text: `✅ PAYMENT CONFIRMED

Welcome to the VIP 👑

━━━━━━━━━━━━━━━━━━
🔒 Access valid for 12 months
━━━━━━━━━━━━━━━━━━

Here is your private link:

${inviteLink}

⚠️ This link is personal and can only be used once.`
        }
      );

      console.log("VIP access sent to", userId);

    } catch (error) {
      console.error("Payment error:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});


// =============================
// SERVER
// =============================
app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running...");
});
