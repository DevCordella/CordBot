require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai'); // Importando a biblioteca OpenAI

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

let cooldowns = new Map();

client.once('ready', () => {
    console.log(`Bot está online como ${client.user.tag}`);
});

// Mapa de cores
const colorMap = {
    azul: '#0000FF',
    blue: '#0000FF',
    vermelho: '#FF0000',
    red: '#FF0000',
    amarelo: '#FFFF00',
    yellow: '#FFFF00',
    verde: '#00FF00',
    green: '#00FF00',
    roxo: '#800080',
    purple: '#800080',
};

client.on('messageCreate', async (message) => {
    console.log('Mensagem recebida:', message.content);  // Verificar se está recebendo a mensagem

    if (message.author.bot) return;  // Ignora mensagens de bots

    // Comando -help
    if (message.content === '-help') {
        const helpEmbed = {
            color: 0x0099ff,
            title: 'Comandos Disponíveis',
            description: 'Aqui estão os comandos que você pode usar:',
            fields: [
                { name: '-ping', value: 'Verifica se o bot está online.' },
                { name: '-ban @usuário ou <ID do usuário>', value: 'Bane um usuário.' },
                { name: '-unban <ID do usuário>', value: 'Desbane um usuário pelo ID.' },
                { name: '-kick @usuário ou <ID do usuário>', value: 'Expulsa um usuário.' },
                { name: '-clear <quantidade>', value: 'Limpa mensagens de um canal (até 100).' },
                { name: '-userinfo @usuário', value: 'Mostra informações sobre um usuário.' },
                { name: '-serverinfo', value: 'Mostra informações sobre o servidor.' },
                { name: '-chatia <mensagem>', value: 'Conversa com a IA (GPT-3).', inline: false },
                { name: '-cor <cor>', value: 'Muda a cor do seu nome no servidor.' },
                { name: '-contato', value: 'Mostra informações de contato.' },
            ],
            footer: { text: 'Bot CordBot' },
        };
        message.channel.send({ embeds: [helpEmbed] });
    }

    // Comando -ping
    if (message.content === '-ping') {
        message.channel.send('Pong!');
    }

    // Comando -ban
    if (message.content.startsWith('-ban')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('Você não tem permissão para banir membros.');
        }

        const userToBan = message.mentions.users.first() || message.guild.members.cache.get(message.content.split(' ')[1]);

        if (!userToBan) {
            return message.reply('Você precisa mencionar um usuário ou fornecer um ID para banir.');
        }

        const memberToBan = message.guild.members.cache.get(userToBan.id);
        if (memberToBan) {
            memberToBan.ban()
                .then(() => message.channel.send(`${userToBan.tag} foi banido com sucesso!`))
                .catch(err => message.reply('Não foi possível banir esse usuário.'));
        } else {
            message.reply('Esse usuário não está no servidor.');
        }
    }

    // Comando -kick
    if (message.content.startsWith('-kick')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('Você não tem permissão para expulsar membros.');
        }

        const userToKick = message.mentions.users.first() || message.guild.members.cache.get(message.content.split(' ')[1]);

        if (!userToKick) {
            return message.reply('Você precisa mencionar um usuário ou fornecer um ID para expulsar.');
        }

        const memberToKick = message.guild.members.cache.get(userToKick.id);
        if (memberToKick) {
            memberToKick.kick()
                .then(() => message.channel.send(`${userToKick.tag} foi expulso com sucesso!`))
                .catch(err => message.reply('Não foi possível expulsar esse usuário.'));
        } else {
            message.reply('Esse usuário não está no servidor.');
        }
    }

    // Comando -clear
    if (message.content.startsWith('-clear')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('Você não tem permissão para limpar mensagens.');
        }

        const args = message.content.split(' ');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('Por favor, forneça um número válido entre 1 e 100.');
        }

        message.channel.bulkDelete(amount, true)
            .then(() => message.channel.send(`${amount} mensagens limpas.`).then(msg => msg.delete({ timeout: 5000 })))
            .catch(err => message.reply('Não foi possível limpar as mensagens.'));
    }

    // Comando -userinfo
    if (message.content.startsWith('-userinfo')) {
        const user = message.mentions.users.first() || message.author;

        const embed = {
            color: 0x0099ff,
            title: `${user.username}'s Info`,
            fields: [
                { name: 'Username', value: user.username },
                { name: 'Tag', value: user.discriminator },
                { name: 'ID', value: user.id },
                { name: 'Status', value: user.presence ? user.presence.status : 'Offline' },
                { name: 'Criado em', value: user.createdAt.toDateString() },
            ],
        };

        message.channel.send({ embeds: [embed] });
    }

    // Comando -serverinfo
    if (message.content === '-serverinfo') {
        const { guild } = message;

        const embed = {
            color: 0x0099ff,
            title: `${guild.name} Info`,
            fields: [
                { name: 'Nome do servidor', value: guild.name },
                { name: 'ID do servidor', value: guild.id },
                { name: 'Membros', value: guild.memberCount.toString() },
                { name: 'Criado em', value: guild.createdAt.toDateString() },
            ],
        };

        message.channel.send({ embeds: [embed] });
    }

    // Comando -unban
    if (message.content.startsWith('-unban')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('Você não tem permissão para desbanir membros.');
        }

        const args = message.content.split(' ');
        const userId = args[1];

        message.guild.bans.fetch()
            .then((bans) => {
                if (!bans.has(userId)) {
                    return message.reply('Este usuário não está banido.');
                }
                message.guild.members.unban(userId)
                    .then(() => message.channel.send(`Usuário com ID \`${userId}\` foi desbanido.`))
                    .catch((err) => {
                        console.error(err);
                        message.reply('Erro ao tentar desbanir este usuário.');
                    });
            })
            .catch((err) => {
                console.error(err);
                message.reply('Não foi possível verificar a lista de banidos.');
            });
    }

    // Comando -chatia
    if (message.content.startsWith('-chatia')) {
        const prompt = message.content.replace('-chatia', '').trim();

        if (!prompt) {
            return message.reply('Você precisa enviar uma mensagem para conversar com a IA.');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            });

            message.reply(response.choices[0].message.content);
        } catch (err) {
            console.error(err);
            message.reply('Desculpe, houve um erro ao tentar conversar com a IA. Tente novamente mais tarde.');
        }
    }

    // Comando -cor
    if (message.content.startsWith('-cor')) {
        const colorName = message.content.split(' ')[1]?.toLowerCase();
        const hexColor = colorMap[colorName];

        if (!hexColor) {
            return message.reply('Por favor, forneça uma cor válida. Exemplos: azul, vermelho, amarelo, verde, roxo.');
        }

        try {
            let role = message.guild.roles.cache.find(role => role.name === `Cor: ${colorName}`);
            
            if (!role) {
                role = await message.guild.roles.create({
                    name: `Cor: ${colorName}`,
                    color: hexColor,
                    reason: 'Papel de cor personalizado',
                });
            } else {
                await role.setColor(hexColor);
            }

            if (!message.member.roles.cache.has(role.id)) {
                await message.member.roles.add(role);
                message.reply(`Sua cor foi alterada para ${colorName}!`);
            } else {
                message.reply(`Você já tem a cor ${colorName} como seu papel.`);
            }
        } catch (err) {
            console.error(err);
            message.reply('Houve um erro ao tentar alterar a cor. Certifique-se de que o bot tem permissão para gerenciar papéis.');
        }
    }
});

client.login(process.env.BOT_TOKEN);
