const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

module.exports = {
    name: 'support',
    async execute(client) {
        client.once('ready', async () => {
            console.log(`✅ Модуль support.js завантажено!`);

            const supportChannel = await client.channels.fetch(process.env.SUPPORT_CHANNEL_ID);
            if (supportChannel) {
                const messages = await supportChannel.messages.fetch({ limit: 10 });
                const panelExists = messages.some(msg => msg.embeds.length > 0 && msg.embeds[0].title === '🛠 Технічна підтримка');
                
                if (!panelExists) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛠 Технічна підтримка')
                        .setDescription('📌 Тут ви можете знайти рішення популярних технічних проблем та звернутися за допомогою до технічної підтримки.')
                        .setColor(0x0099ff);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('open_ticket')
                            .setLabel('🎫 Подати заявку')
                            .setStyle(ButtonStyle.Primary)
                    );

                    await supportChannel.send({ embeds: [embed], components: [row] });
                    console.log('✅ Панель технічної підтримки відправлена');
                }
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton() && interaction.customId === 'open_ticket') {
                console.log(`📝 ${interaction.user.tag} натиснув кнопку подачі заявки`);

                const modal = new ModalBuilder()
                    .setCustomId('ticket_form')
                    .setTitle('📄 Подати заявку');

                const titleInput = new TextInputBuilder()
                    .setCustomId('ticket_title')
                    .setLabel('📌 Назва проблеми')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('ticket_desc')
                    .setLabel('📝 Опис проблеми')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const proofInput = new TextInputBuilder()
                    .setCustomId('ticket_proof')
                    .setLabel('📷 Докази (якщо є)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(descInput),
                    new ActionRowBuilder().addComponents(proofInput)
                );

                await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === 'ticket_form') {
                const title = interaction.fields.getTextInputValue('ticket_title');
                const description = interaction.fields.getTextInputValue('ticket_desc');
                const proof = interaction.fields.getTextInputValue('ticket_proof') || '❌ Не надано';

                const adminChannel = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
                if (adminChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`📩 Нова заявка від ${interaction.user.tag}`)
                        .setDescription(`Нікнейм: <@${interaction.user.id}>`)
                        .addFields(
                            { name: '📌 Назва', value: title },
                            { name: '📝 Опис', value: description },
                            { name: '📷 Докази', value: proof }
                        )
                        .setColor(0xff0000);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`reply_${interaction.user.id}`)
                            .setLabel('✉️ Відповісти')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`close_${interaction.user.id}`)
                            .setLabel('🔒 Закрити')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await adminChannel.send({ embeds: [embed], components: [row] });
                }
                await interaction.reply({ content: '✅ Ваша заявка відправлена до техпідтримки.', ephemeral: true });
            }

            if (interaction.isButton() && interaction.customId.startsWith('reply_')) {
                const ticketUserId = interaction.customId.split('_')[1];
                if (interaction.user.id !== process.env.ADMIN_ID) {
                    await interaction.reply({ content: '❌ Ви не маєте прав для відповіді!', ephemeral: true });
                    return;
                }

                const modal = new ModalBuilder()
                    .setCustomId(`response_form_${ticketUserId}`)
                    .setTitle('📩 Відповідь на заявку');

                const responseInput = new TextInputBuilder()
                    .setCustomId('response_message')
                    .setLabel('✉️ Введіть вашу відповідь')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(responseInput));
                await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId.startsWith('response_form_')) {
                const ticketUserId = interaction.customId.split('_')[2];
                const responseMessage = interaction.fields.getTextInputValue('response_message');
                const user = await client.users.fetch(ticketUserId);

                if (user) {
                    await user.send({ content: `📩 Вашу заявку було розглянуто адміністратором:\n\n${responseMessage}` });
                }

                await interaction.reply({ content: '✅ Відповідь надіслано користувачу.', ephemeral: true });
            }

            if (interaction.isButton() && interaction.customId.startsWith('close_')) {
                const message = interaction.message;
                
                const embed = EmbedBuilder.from(message.embeds[0])
                    .setColor(0x808080)
                    .setFooter({ text: '🔒 Заявка закрита' });

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reply_${interaction.user.id}`)
                        .setLabel('✉️ Відповісти')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`close_${interaction.user.id}`)
                        .setLabel('🔒 Закрити')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );

                await interaction.update({ embeds: [embed], components: [disabledRow] });
            }
        });
    }
};
