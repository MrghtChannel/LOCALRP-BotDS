require("dotenv").config();
const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = (client) => {
    console.log("✅ Модуль voice.js підключено!");

    const CATEGORY_ID = process.env.CATEGORY_ID;
    const CONTROL_CHANNEL_ID = process.env.CONTROL_CHANNEL_ID;

    let userChannels = new Map();

    client.once("ready", async () => {
        console.log("🎤 Voice Manager активовано!");

        try {
            const controlChannel = await client.channels.fetch(CONTROL_CHANNEL_ID);
            await controlChannel.bulkDelete(10);
            await sendControlPanel(controlChannel);
        } catch (error) {
            console.error("❌ Помилка завантаження панелі керування:", error);
        }
    });

    async function sendControlPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle("🎛 Контроль голосових каналів")
            .setDescription("🎤 Використовуйте кнопки для керування своїм голосовим каналом.")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("create_channel").setLabel("➕ Створити канал").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("view_members").setLabel("👥 Учасники").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("settings").setLabel("⚙️ Налаштування").setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ embeds: [embed], components: [row] });
    }

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton()) return;
        const { customId, member, guild } = interaction;

        if (customId === "create_channel") {
            if (!member.voice.channel) {
                return interaction.reply({ content: "❌ Ви повинні бути у голосовому каналі!", ephemeral: true });
            }

            if (userChannels.has(member.id)) {
                return interaction.reply({ content: "⚠️ Ви вже маєте створений канал!", ephemeral: true });
            }

            try {
                const voiceChannel = await guild.channels.create({
                    name: `🎙️ ${member.user.username}'s Channel`,
                    type: 2,
                    parent: CATEGORY_ID,
                    permissionOverwrites: [
                        { id: guild.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers] }
                    ]
                });

                userChannels.set(member.id, voiceChannel.id);
                await member.voice.setChannel(voiceChannel);

                return interaction.reply({ content: `✅ Ваш канал створено: ${voiceChannel}`, ephemeral: true });
            } catch (error) {
                console.error("❌ Помилка створення голосового каналу:", error);
                return interaction.reply({ content: "❌ Сталася помилка при створенні каналу!", ephemeral: true });
            }
        }

        if (customId === "view_members") {
            if (!member.voice.channel) {
                return interaction.reply({ content: "❌ Ви не в голосовому каналі!", ephemeral: true });
            }

            if (userChannels.get(member.id) !== member.voice.channel.id) {
                return interaction.reply({ content: "❌ Ви не є власником цього каналу!", ephemeral: true });
            }

            const members = member.voice.channel.members.map(m => m.user.username).join(", ") || "Немає учасників";
            const row = new ActionRowBuilder().addComponents(
                ...member.voice.channel.members.map((m) => {
                    return new ButtonBuilder()
                        .setCustomId(`kick_${m.id}`)
                        .setLabel(`❌ Викинути ${m.user.username}`)
                        .setStyle(ButtonStyle.Danger);
                })
            );

            return interaction.reply({
                content: `👥 Учасники: ${members}`,
                components: row.length ? [row] : [],
                ephemeral: true
            });
        }

        if (customId === "settings") {
            const channelId = userChannels.get(member.id);
            if (!channelId) {
                return interaction.reply({ content: "⚠️ Ви не власник жодного каналу!", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("limit_5").setLabel("🔢 Ліміт 5").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("limit_10").setLabel("🔟 Ліміт 10").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("limit_none").setLabel("🚫 Без ліміту").setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ content: "📌 Оберіть ліміт учасників:", components: [row], ephemeral: true });
        }

        if (customId.startsWith("limit_")) {
            const channelId = userChannels.get(member.id);
            if (!channelId) return;

            const voiceChannel = guild.channels.cache.get(channelId);
            if (!voiceChannel) return;

            const limit = customId === "limit_none" ? 0 : parseInt(customId.split("_")[1]);
            await voiceChannel.setUserLimit(limit);
            return interaction.reply({ content: `✅ Ліміт встановлено на **${limit || "без обмежень"}**`, ephemeral: true });
        }

        if (customId.startsWith("kick_")) {
            if (userChannels.get(member.id) !== member.voice.channel.id) {
                return interaction.reply({ content: "❌ Ви не можете кікнути учасника, бо не є власником цього каналу!", ephemeral: true });
            }

            const userToKick = await guild.members.fetch(customId.split("_")[1]);
            if (!userToKick) {
                return interaction.reply({ content: "❌ Користувача не знайдено!", ephemeral: true });
            }

            try {
                await userToKick.voice.disconnect();
                return interaction.reply({ content: `✅ ${userToKick.user.username} був викинутий з каналу.`, ephemeral: true });
            } catch (error) {
                console.error("❌ Помилка при кікання користувача:", error);
                return interaction.reply({ content: "❌ Помилка при спробі викинути учасника.", ephemeral: true });
            }
        }
    });

    client.on("voiceStateUpdate", async (oldState, newState) => {
        const channel = oldState.channel;
        if (!channel) return;

        const ownerId = [...userChannels.entries()].find(([_, id]) => id === channel.id)?.[0];
        if (!ownerId) return;

        if (channel.members.size === 0) {
            try {
                await channel.delete();
                userChannels.delete(ownerId);
                console.log(`🗑️ Видалено пустий голосовий канал: ${channel.name}`);
            } catch (error) {
                console.error("❌ Помилка видалення голосового каналу:", error);
            }
        }
    });
};
