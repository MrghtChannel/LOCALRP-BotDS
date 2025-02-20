const { Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
        const channelId = process.env.WELCOME_CHANNEL_ID; 
        const welcomeChannel = member.guild.channels.cache.get(channelId);
        
        if (!welcomeChannel) return console.error('❌ Канал привітань не знайдено!');

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('Новий користувач!')
            .setDescription(`**${member.user.username}** приєднався(-лася) до сервера! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        welcomeChannel.send({ embeds: [welcomeEmbed] });
    });
};