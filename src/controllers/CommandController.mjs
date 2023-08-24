import {REST} from "discord.js";
import {Routes} from "discord-api-types/v10";

import {Help} from "../models/command/commands/Help.mjs";
import {SecurityUtility} from "../models/utility/SecurityUtility.mjs";
import {EmbedUtility} from "../models/utility/EmbedUtility.mjs";
import {DiscordUtility} from "../models/utility/DiscordUtility.mjs";
import {ScanProjectManager} from "./ScanProjectManager.mjs";

export class CommandController
{
    /** @type {Command[]} */
    Commands

    Initialize()
    {
        // Create all commands to be used
        this.Commands =
        [
            new Help()
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

            if (command.Admin && !SecurityUtility.IsAdmin(interaction))
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Admin command",
                    `You are not the admin of this bot.`
                ))
            }
            else if (command.OnlyProjectChannel && !ScanProjectManager.Instance.DataCenter.GetProjectFromChannel(interaction))
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Not in project channel",
                    `You need to be in a project channel to use this command.`
                ))
            }
            else if (command.MinArgs + 1 > interaction.options.length)
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage(
                    "Args are missing",
                    `/${command.Name} ${command.Args}\n\nRequire minimum ${command.MinArgs} parameters to the command.`
                ))
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