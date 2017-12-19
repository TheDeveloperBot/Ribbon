/*
 *   This file is part of Ribbon
 *   Copyright (C) 2017-2018 Favna
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, version 3 of the License
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *   Additional Terms 7.b and 7.c of GPLv3 apply to this file:
 *       * Requiring preservation of specified reasonable legal notices or
 *         author attributions in that material or in the Appropriate Legal
 *         Notices displayed by works containing it.
 *       * Prohibiting misrepresentation of the origin of that material,
 *         or requiring that modified versions of such material be marked in
 *         reasonable ways as different from the original version.
 */

const Discord = require('discord.js'),
	commando = require('discord.js-commando'),
	fs = require('fs'),
	jsonfile = require('jsonfile'),
	moment = require('moment'),
	{oneLine} = require('common-tags'),
	path = require('path');

module.exports = class warnCommand extends commando.Command {
	constructor (client) {
		super(client, {
			'name': 'warn',
			'group': 'moderation',
			'aliases': ['warning'],
			'memberName': 'warn',
			'description': 'Warn a member with a specified amount of points',
			'examples': ['warn {member} {points} {reason}'],
			'guildOnly': true,
			'throttling': {
				'usages': 2,
				'duration': 3
			},

			'args': [
				{
					'key': 'member',
					'prompt': 'Which member to warn?',
					'type': 'member',
					'label': 'member name or ID'
				},
				{
					'key': 'points',
					'prompt': 'What do you want me to announce?',
					'type': 'integer',
					'label': 'warn points to give'
				},
				{
					'key': 'reason',
					'prompt': 'What is the reason you want to warn the user?',
					'type': 'string',
					'label': 'reason for the warning',
					'default': ''
				}
			]
		});
	}

	deleteCommandMessages (msg) {
		if (msg.deletable && this.client.provider.get(msg.guild, 'deletecommandmessages', false)) {
			msg.delete();
		}
	}

	hasPermission (msg) {
		return this.client.isOwner(msg.author) || msg.member.hasPermission('ADMINISTRATOR');
	}

	run (msg, args) {
		const embed = new Discord.MessageEmbed(),
			modLogs = this.client.provider.get(msg.guild, 'modlogchannel',
				msg.guild.channels.exists('name', 'mod-logs')
					? msg.guild.channels.find('name', 'mod-logs').id
					: null);

		let warnobj = {},
			warnpoints = 0;

		jsonfile.readFile(path.join(__dirname, `data/${msg.guild.id}/warnlog.json`), 'utf8', (readErr, obj) => {
			if (readErr) {
				msg.reply('📘 No warnpoints log found for this server, creating one and filling with the first warning data');

				warnobj = {
					[args.member.id]: {
						'usertag': args.member.user.tag,
						'points': args.points
					}
				};

				fs.mkdirSync(path.join(__dirname, `data/${msg.guild.id}`));
				jsonfile.writeFile(path.join(__dirname, `data/${msg.guild.id}/warnlog.json`), warnobj, {'flag': 'wx+'}, (writeNoFileErr) => {
					if (writeNoFileErr) {
						console.error(`Error in command: Warn\nServer: ${msg.guild.id} | ${msg.guild.name}\nError: ${writeNoFileErr}`); // eslint-disable-line no-console
						this.deleteCommandMessages(msg);
						
						return msg.reply(oneLine `⚠️ An error occured writing the warning to disc and the error has been logged on Favna\'s end.
							You can contact my developer on his server. Use \`${msg.guild.commandPrefix}invite\` to get an invite to his server.`);
					}

					embed
						.setColor('#E24141')
						.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
						.setDescription(`**Member:** ${args.member.user.tag} (${args.member.id})\n` +
							'**Action:** Warn\n' +
							`**Previous Warning Points:** ${warnpoints}\n` +
							`**Current Warning Points:** ${args.points}\n` +
							`**Reason:** ${args.reason !== '' ? args.reason : 'No reason has been added by the moderator'}`)
						.setFooter(moment().format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z'));

					if (this.client.provider.get(msg.guild, 'modlogs', true)) {
						if (!this.client.provider.get(msg.guild, 'hasSentModLogMessage', false)) {
							msg.reply(oneLine `📃 I can keep a log of warning points given if you create a channel named \'mod-logs\'
									(or some other name configured by the ${msg.guild.commandPrefix}setmodlogs command) and give me access to it.
									Alternatively use the ${msg.guild.commandPrefix}listwarn command to view the current warning points for a given member.
									This message will only show up this one time and never again after this so if you desire to set up mod logs make sure to do so now.`);
							this.client.provider.set(msg.guild, 'hasSentModLogMessage', true);
						}

						this.deleteCommandMessages(msg);
						
						return modLogs !== null ? msg.guild.channels.get(modLogs).send({embed}) : null;
					}
					this.deleteCommandMessages(msg);
					
					return null;
				});
			} else {
				if (!obj[args.member.id]) {
					obj[args.member.id] = {
						'usertag': args.member.user.tag,
						'points': args.points
					};
				} else {
					warnpoints = obj[args.member.id].points;
					obj[args.member.id].points = warnpoints + args.points;
				}

				jsonfile.writeFile(path.join(__dirname, `data/${msg.guild.id}/warnlog.json`), obj, (writeFileErr) => {
					if (writeFileErr) {
						this.deleteCommandMessages(msg);
						
						return msg.reply(oneLine `⚠️ An error occured writing the warning to disc and the error has been logged on Favna\'s end.
						You can contact my developer on his server. Use \`${msg.guild.commandPrefix}invite\` to get an invite to his server.`);
					}

					embed
						.setColor('#E24141')
						.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
						.setDescription(`**Member:** ${args.member.user.tag} (${args.member.id})\n` +
							'**Action:** Warn\n' +
							`**Previous Warning Points:** ${warnpoints}\n` +
							`**Current Warning Points:** ${warnpoints + args.points}\n` +
							`**Reason:** ${args.reason !== '' ? args.reason : 'No reason has been added by the moderator'}`)
						.setFooter(moment().format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z'));


					if (this.client.provider.get(msg.guild, 'modlogs', true)) {
						if (!this.client.provider.get(msg.guild, 'hasSentModLogMessage', false)) {
							msg.reply(oneLine `📃 I can keep a log of warning points given if you create a channel named \'mod-logs\'
								(or some other name configured by the ${msg.guild.commandPrefix}setmodlogs command) and give me access to it.
								Alternatively use the ${msg.guild.commandPrefix}listwarn command to view the current warning points for a given member.
								This message will only show up this one time and never again after this so if you desire to set up mod logs make sure to do so now.`);
							this.client.provider.set(msg.guild, 'hasSentModLogMessage', true);
						}

	
						this.deleteCommandMessages(msg);
						
						return modLogs !== null ? msg.guild.channels.get(modLogs).send({embed}) : null;
					}
					this.deleteCommandMessages(msg);
					
					return null;
				});
			}
		});
	}
};