import {GuildMemberManager, REST} from "discord.js";
import {Routes} from "discord-api-types/v10";

import {SecurityUtility} from "../models/utility/SecurityUtility.mjs";
import {EmbedUtility} from "../models/utility/EmbedUtility.mjs";
import {DiscordUtility} from "../models/utility/DiscordUtility.mjs";
import {ScanProjectManager} from "./ScanProjectManager.mjs";
import {Help} from "../models/command/commands/Help.mjs";
import {Templates} from "../models/command/commands/Templates.mjs";
import {Projects} from "../models/command/commands/Projects.mjs";
import {Chapters} from "../models/command/commands/Chapters.mjs";
import {Tasks} from "../models/command/commands/Tasks.mjs";
import {Info} from "../models/command/commands/Info.mjs";
import {Panel} from "../models/command/commands/Panel.mjs";
import {Stats} from "../models/command/commands/Stats.mjs";
import {Server} from "../models/command/commands/Server.mjs";
import {Changelogs} from "../models/command/commands/Changelogs.mjs";
import {Faq} from "../models/command/commands/Faq.mjs";

// Random funny message to display when a user doesn't have the permission to use a creator command
const creatorErrorRandomMessages =
[
    "You doesn't have enough power to handle this command.",
    "Your dark energy is not strong enough to handle this command.",
    "Your cultivation stage is too low to handle this command.",
    "You are not the chosen one to handle this command.",
    "A superior entity prevent you from using this command.",
    "You are not worthy to use this command.",
    "You fool ! You can't handle this command !",
    "Your qi is too weak to handle this command.",
    "The dragon council doesn't knowledge you as a worthy user of this command.",
    "Nooo, you're not the one I awaited for !",
    "Only Kayden that fat cat can hope to use this command.",
    "Your synchronization rate is too low to handle this command.",
    "Available only for regressors.",
    "Harry, you're not a wizard.",
];

export class CommandController
{
    /** @type {Command[]} */
    Commands

    Initialize()
    {
        // Create all commands to be used
        this.Commands =
        [
            new Help(),
            new Faq(),
            new Templates(),
            new Projects(),
            new Chapters(),
            new Tasks(),
            new Info(),
            new Stats(),
            new Server(),
            new Changelogs(),
            new Panel()
        ];
    }

    async RefreshSlashCommands() {
        const rest = new REST({version: '10'}).setToken(process.env.token);

        await rest.put(
            Routes.applicationCommands(ScanProjectManager.Instance.DiscordClient.user.id),
            {
                body: this.Commands.map(command => command.AsSlashCommand())
            },
        );
    }

    async OnCommand(interaction) {
        for (let command of this.Commands)
        {
            if (command.Name !== interaction.commandName) continue;

            ScanProjectManager.Instance.DataCenter.InitData(interaction);

            if (interaction.guildId)
            {
                // Fetch guild data
                await ScanProjectManager.Instance.DiscordClient.guilds.cache.get(interaction.guildId).members.fetch();
            }

            if (command.OnlyCreator && !SecurityUtility.IsCreator(interaction))
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Creator command",
                    creatorErrorRandomMessages[Math.floor(Math.random() * creatorErrorRandomMessages.length)]
                ), true)
            }
            if (command.Admin && !SecurityUtility.IsAdmin(interaction))
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Admin command",
                    `You are not the admin of this server.`
                ), true)
            }
            else if (command.OnlyProjectChannel && !ScanProjectManager.Instance.DataCenter.GetProjectFromChannel(interaction))
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Not in project channel",
                    `You need to be in a project channel to use this command.`
                ), true)
            }
            else if (command.OnlyInServer && !interaction.guildId)
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Not in server",
                    `You need to be in a server to use this command.`
                ), true)
            }
            else if (command.MinArgs + 1 > interaction.options.length)
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Args are missing",
                    `/${command.Name} ${command.Args}\n\nRequire minimum ${command.MinArgs} parameters to the command.`
                ), true)
            }
            else
            {
                try
                {
                    await command.Run(interaction);
                }
                catch (e)
                {
                    await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                        "Error",
                        `An error occurred: ` + e.toString()
                    ));

                    console.error(e);
                }
            }
        }
    }

    async OnAutocomplete(interaction)
    {
        const focusedOption = interaction.options.getFocused(true);

        for (let command of this.Commands)
        {
            if (command.Name === interaction.commandName)
            {
                await command.OnAutocomplete(interaction, focusedOption);
            }
        }
    }
}