import {Client, GatewayIntentBits} from "discord.js";

import {CommandController} from "./CommandController.mjs";
import {Logger} from "../models/utility/Logger.mjs";

export class ScanProjectManager
{
    /** @type {CommandController} */
    CommandController
    /** @type {Client} */
    Client

    constructor()
    {
        this.CommandController = new CommandController();

        this.CommandController.AssignScanProjectManager(this);

        this.Client = new Client({intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages
        ]});

        this.Client.login(process.env.token).catch((reason) =>
        {
            Logger.Log(`Login failed for ${reason}`);
        });

        this.Client.on("disconnect", async () =>
        {
            Logger.Log("Disconnected");
        });

        this.Client.once('ready', async () =>
        {
            Logger.Log('Connected');

            await this.CommandController.RefreshSlashCommands();
        });

        this.Client.on("interactionCreate", async interaction =>
        {
            if (interaction.isAutocomplete())
            {
                try
                {
                    await this.CommandController.OnAutocomplete(interaction);
                }
                catch (error)
                {
                    Logger.Log(`Autocomplete`, error);
                }
            } else if (interaction.isCommand()) {
                try
                {
                    await this.CommandController.OnCommand(interaction);
                }
                catch (error)
                {
                    Logger.Log(`Command`, error);
                }
            }
        });
    }
}