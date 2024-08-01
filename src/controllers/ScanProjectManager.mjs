import {Client, GatewayIntentBits} from "discord.js";

import {CommandController} from "./CommandController.mjs";
import {DataController} from "./DataController.mjs";
import {Logger} from "../models/utility/Logger.mjs";
import {EmbedUtility} from "../models/utility/EmbedUtility.mjs";

export class ScanProjectManager
{
    /** @type {ScanProjectManager} */
    static Instance
    /** @type {CommandController} */
    CommandCenter
    /** @type {DataController} */
    DataCenter
    /** @type {Client} */
    DiscordClient

    /** @type {Object<string, Function>[]} */
    _events = []
    /** @type {Date} */
    _startedAt = new Date()

    constructor()
    {
        ScanProjectManager.Instance = this;
        this.CommandCenter = new CommandController();
        this.DataCenter = new DataController();

        this.CommandCenter.Initialize();

        this.DiscordClient = new Client({intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers
        ]});

        this.DiscordClient.login(process.env.token).catch((reason) =>
        {
            Logger.Log(`Login failed for ${reason}`);
        });

        this.DiscordClient.on("disconnect", async () =>
        {
            Logger.Log("Disconnected");
        });

        this.DiscordClient.once('ready', async () =>
        {
            Logger.Log('Connected');
            await this.DiscordClient.user.setActivity(`/help | v${process.env.npm_package_version}`);
            await this.CommandCenter.RefreshSlashCommands();

            this.DataCenter.Backup();
            this.DataCenter.DailyCheck();

            setInterval(() => this.DataCenter.Backup(), 1000 * 60 * 60 * 24);
            setInterval(() => this.DataCenter.SaveAll(), 1000 * 60 * 5);
            setInterval(() => this.DataCenter.DailyCheck(), 1000 * 60 * 60 * 24);
            setInterval(() => this.DiscordClient.user.setActivity(`/help | v${process.env.npm_package_version}`), 1000 * 60 * 60 * 10);
        });

        this.DiscordClient.on("error", e =>
        {
            Logger.Log("Discord error", e);
        });

        this.DiscordClient.on("interactionCreate", async interaction =>
        {
            if (interaction.isAutocomplete())
            {
                try
                {
                    await this.CommandCenter.OnAutocomplete(interaction);
                }
                catch (error)
                {
                    Logger.Log(`Autocomplete`, error);
                }
            }
            else if (interaction.isCommand()) {
                try
                {
                    await this.CommandCenter.OnCommand(interaction);
                }
                catch (error)
                {
                    Logger.Log(`Command`, error);
                }
            }
            else
            {
                for (let i = 0; i < this._events.length; i++)
                {
                    try
                    {
                        await this._events[i].event(interaction);
                    }
                    catch (error)
                    {
                        Logger.Log(error);
                    }
                }
            }
        });

        process.on('uncaughtException', (error) => {
            console.error(error);
        });

        process.on('unhandledRejection', (error) => {
            console.error(error);
        });
    }

    SubscribeToEvent(id, event)
    {
        this._events.push({id: id, event: event});
    }

    UnsubscribeFromEvent(id)
    {
        for (let i = 0; i < this._events.length; i++)
        {
            if (this._events[i].id === id)
            {
                this._events.splice(i, 1);
                return;
            }
        }
    }

    async EmergencyExit(reason)
    {
        Logger.Log("Emergency exit", reason);

        // Send a message to creator in DM with the reason
        await this.SendDM(process.env.creatorID, EmbedUtility.FormatMessageContent(EmbedUtility.GetWarningEmbedMessage("Emergency exit", reason)));

        process.exit();
    }

    /**
     *  Get the user object from discord.
     * @param id The ID of the user you want to get
     * @returns {Promise<User>}
     */
    async GetUser(id)
    {
        return await this.DiscordClient.users.fetch(id);
    }

    async SendDM(userID, message)
    {
        try
        {
            const user = await this.GetUser(userID);

            if (user.bot) return;

            await user.createDM();
            await user.send(message);
        }
        catch (error)
        {
            Logger.Log("SendDM", error);
        }
    }

    async SendMessageInChannel(serverId, channelId, message)
    {
        const server = await this.DiscordClient.guilds.fetch(serverId);
        const channel = await server.channels.fetch(channelId);

        await channel.send(message);
    }

    GetUptime()
    {
        return this._startedAt;
    }
}