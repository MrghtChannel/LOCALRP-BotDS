const { Client, GatewayIntentBits, SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { saveToDatabase } = require('../db/db');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log('✅ Модуль publish.js завантажено!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'publish') {
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const title = interaction.options.getString('title');
        const text = interaction.options.getString('text');
        const image = interaction.options.getAttachment('image');
        const embedOption = interaction.options.getBoolean('embed') || false;
        const style = interaction.options.getString('style') || 'none';
        const saveToDB = interaction.options.getBoolean('save') || false;

        if (!channel || !(channel.isTextBased && channel.type === ChannelType.GuildText)) {
            return interaction.reply({ content: 'Вказано невірний канал або ID.', ephemeral: true });
        }

        let content = role ? `<@&${role.id}>\n` : '';

        const formatText = (text, style) => {
            switch (style) {
                case 'bold': return `**${text}**`;
                case 'italic': return `*${text}*`;
                case 'code': return `\`${text}\``;
                case 'block': return `\
\`${text}\
\``;
                case 'quote': return `> ${text}`;
                default: return text;
            }
        };

        if (embedOption) {
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(text)
                .setColor(0xEF7F31)
                .setTimestamp()
                .setThumbnail(client.user.displayAvatarURL()); 

            if (image) {
                embed.setImage(image.url);
            }

            content += '\n'; 
            await channel.send({ content, embeds: [embed] });
        } else {
            content += formatText(title, 'bold') + '\n';
            content += formatText(text, style) + '\n';
            const messagePayload = { content };

            if (image) {
                messagePayload.files = [image.url];
            }

            await channel.send(messagePayload);
        }

        if (saveToDB) {
            saveToDatabase(title, text, channel.id, role ? role.id : null, image ? image.url : null);
        }

        await interaction.reply({ content: 'Повідомлення опубліковано!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);

const { REST, Routes } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('publish')
        .setDescription('Публікує повідомлення від імені бота')
        .addChannelOption(option => option.setName('channel').setDescription('Канал для публікації').setRequired(true))
        .addStringOption(option => option.setName('title').setDescription('Заголовок').setRequired(true))
        .addStringOption(option => option.setName('text').setDescription('Текст повідомлення').setRequired(true))
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Стиль оформлення тексту')
                .setRequired(false)
                .addChoices(
                    { name: 'Немає', value: 'none' },
                    { name: 'Жирний', value: 'bold' },
                    { name: 'Курсив', value: 'italic' },
                    { name: 'Код', value: 'code' },
                    { name: 'Блок коду', value: 'block' },
                    { name: 'Цитата', value: 'quote' }
                )
        )
        .addRoleOption(option => option.setName('role').setDescription('Роль для згадування').setRequired(false))
        .addAttachmentOption(option => option.setName('image').setDescription('Додати зображення').setRequired(false))
        .addBooleanOption(option => option.setName('embed').setDescription('Чи використовувати Embed?').setRequired(false))
        .addBooleanOption(option => option.setName('save').setDescription('Чи зберігати в базу даних?').setRequired(false))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        console.log('Починаємо оновлення (/) команд...');
        await rest.put(Routes.applicationCommands(process.env.BOT_ID), { body: commands });
        console.log('Команди успішно зареєстровані!');
    } catch (error) {
        console.error(error);
    }
})();
