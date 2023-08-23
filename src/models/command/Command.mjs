import {SlashCommandBuilder, AutocompleteInteraction, Client} from "discord.js";
import {StringUtility} from "../utility/StringUtility.mjs";

export class Command
{
    /** @type {ScanProjectManager} */
    _scanProjectManager
    /** @type {CommandController} */
    _commandController
    /** @type {Client} */
    _client

    /** @type {string} */
    Name
    /** @type {string} */
    Args
    /** @type {number} */
    MinArgs
    /** @type {string} */
    Description
    /** @type {boolean} */
    Admin

    constructor(name, args, minArgs, description, admin = false)
    {
        this.Name = name;
        this.Args = args;
        this.MinArgs = minArgs;
        this.Description = description;
        this.Admin = admin;
    }

    AssignScanProjectManager(scanProjectManager)
    {
        this._scanProjectManager = scanProjectManager;
        this._commandController = this._scanProjectManager.CommandCenter;
        this._client = this._scanProjectManager.DiscordClient;
    }

    AsSlashCommand()
    {
        let description = StringUtility.CutText(this.Description, 100);

        if (this.Admin)
        {
            description = "[Only admin] " + StringUtility.CutText(this.Description, 100 - 13);
        }

        const slashCommand = new SlashCommandBuilder()
            .setName(this.Name)
            .setDescription(description);

        this.AddSubCommands(slashCommand);
        this.AddOptions(slashCommand);

        return slashCommand;
    }

    /**
     * Used to add sub commands to the slash command.
     * @param {SlashCommandBuilder} slashCommand
     */
    AddSubCommands(slashCommand) {}

    AddOptions(slashCommand) {}

    /**
     *
     * @param interaction {AutocompleteInteraction}
     * @param focusedOption
     * @returns {Promise<void>}
     */
    async OnAutocomplete(interaction, focusedOption) {}

    async Run(interaction) {}
}