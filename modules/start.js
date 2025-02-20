const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = (client) => {
    client.once('ready', async () => {
        console.log('✅ Модуль start.js завантажено!');
        
        const channel = client.channels.cache.get(process.env.TARGET_CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 10 });
            const existingPanel = messages.find(m => m.embeds.length > 0 && m.embeds[0].title === 'Початок');
            
            if (!existingPanel) {
                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('Початок')
                    .setDescription('Щоб почати, натисніть на реакцію ✅');
                
                const message = await channel.send({ embeds: [embed] });
                await message.react('✅');
            } else {
                console.log('⚠️ Панель уже існує, нова не створюється.');
            }
        } else {
            console.error('❌ Помилка: Канал не знайдено! Переконайтеся, що TARGET_CHANNEL_ID вірний.');
        }
    });

    client.on('messageReactionAdd', async (reaction, user) => {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('❌ Не вдалося отримати реакцію:', error);
                return;
            }
        }

        if (reaction.emoji.name === '✅' && !user.bot) {
            const roleId = process.env.ROLE_ID;
            const guild = reaction.message.guild;
            if (!guild) return;

            try {
                const member = await guild.members.fetch(user.id);
                if (member) {
                    await member.roles.add(roleId);
                    console.log(`✅ Роль видано користувачу ${user.tag}`);
                }
            } catch (error) {
                console.error('❌ Помилка при видачі ролі:', error);
            }
        }
    });

    client.on('messageReactionRemove', async (reaction, user) => {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('❌ Не вдалося отримати реакцію:', error);
                return;
            }
        }

        if (reaction.emoji.name === '✅' && !user.bot) {
            const roleId = process.env.ROLE_ID;
            const guild = reaction.message.guild;
            if (!guild) return;

            try {
                const member = await guild.members.fetch(user.id);
                if (member) {
                    await member.roles.remove(roleId);
                    console.log(`❌ Роль видалено у користувача ${user.tag}`);
                }
            } catch (error) {
                console.error('❌ Помилка при видаленні ролі:', error);
            }
        }
    });
};
