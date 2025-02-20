require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const SERVER_IP = process.env.SERVER_IP;
const API_URL = "https://cdn.rage.mp/master/";

client.once("ready", async () => {
  console.log("✅ Модуль online.js завантажено!");
  updateStatus();
  setInterval(updateStatus, 60 * 1000);
});

async function updateStatus() {
  try {
    const response = await axios.get(API_URL);
    const servers = response.data;

    if (servers[SERVER_IP]) {
      const players = servers[SERVER_IP].players;
      client.user.setActivity(`👥 Онлайн: ${players}`, { type: 3 });
    } else {
      client.user.setActivity("❌ Сервер не знайдено", { type: 3 });
    }
  } catch (error) {
    console.error("❗ Помилка отримання даних:", error);
    client.user.setActivity("⚠️ Помилка запиту", { type: 3 });
  }
}

client.login(process.env.TOKEN);