import {SlashCommandBuilder, AutocompleteInteraction, Client} from "discord.js";
import {StringUtility} from "../utility/StringUtility.mjs";
import {ScanProjectManager} from "../../controllers/ScanProjectManager.mjs";

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
    Admin = false
    /** @type {boolean} */
    OnlyProjectChannel = false
    /** @type {boolean} */
    OnlyInServer = false

    constructor(name, args, minArgs, description)
    {
        this.Name = name;
        this.Args = args;
        this.MinArgs = minArgs;
        this.Description = description;

        this._scanProjectManager = ScanProjectManager.Instance;
        this._commandController = this._scanProjectManager.CommandCenter;
        this._client = this._scanProjectManager.DiscordClient;
    }

    SetAdmin()
    {
        this.Admin = true;
    }

    SetOnlyProjectChannel()
    {
        this.OnlyProjectChannel = true;
    }

    SetOnlyInServer()
    {
        this.OnlyInServer = true;
    }

    AsSlashCommand()
    {
        let description = StringUtility.CutText(this.Description, 100);

        const slashCommand = new SlashCommandBuilder()
            .setName(this.Name)
            .setDescription(description)
            .setDMPermission(!this.OnlyInServer)
            .setDefaultMemberPermissions(this.Admin ? 8 : undefined);

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