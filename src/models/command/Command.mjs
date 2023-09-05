import {SlashCommandBuilder, AutocompleteInteraction, Client} from "discord.js";
import {StringUtility} from "../utility/StringUtility.mjs";
import {ScanProjectManager} from "../../controllers/ScanProjectManager.mjs";
import {PermissionFlagsBits} from "discord-api-types/v10";

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
    /** @type {string} */
    LongDescription
    /** @type {boolean} */
    Admin = false
    /** @type {boolean} */
    OnlyProjectChannel = false
    /** @type {boolean} */
    OnlyInServer = false
    /** @type {boolean} */
    OnlyCreator = false

    constructor(name, args, minArgs, description, longDescription = "")
    {
        this.Name = name;
        this.Args = args;
        this.MinArgs = minArgs;
        this.Description = description;
        this.LongDescription = longDescription;

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

    SetOnlyCreator()
    {
        this.OnlyCreator = true;
    }

    AsSlashCommand()
    {
        let description = StringUtility.CutText(this.OnlyCreator ? "이 봇을 만든 사람만 사용할 수 있는 명령입니다" : this.Description, 100);

        const slashCommand = new SlashCommandBuilder()
            .setName(this.Name)
            .setDescription(description)
            .setDMPermission(!this.OnlyInServer)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

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