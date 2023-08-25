import {GuildEmoji} from "discord.js";

import {ScanProjectManager} from "../../controllers/ScanProjectManager.mjs";

/** @return {GuildEmoji} */
function RetrieveEmojiData(emojiName)
{
    const guild = ScanProjectManager.Instance.DiscordClient.guilds.resolve(process.env.mainServerId);

    return guild.emojis.cache.find(emoji => emoji.name === emojiName);
}

export class EmojiUtility
{
    static Emojis =
    {
        Return: "Return",
        Add: "Add",
        Import: "Import",
        List: "List",
        Up: "Up",
        Down: "Down",
        Left: "Left",
    };

    static GetEmoji(emojiName)
    {
        const emoji = RetrieveEmojiData(emojiName);
        const prefix = emoji.animated ? "a" : "";

        return `<${prefix}:${emoji.name}:${emoji.id}>`;
    }

    static GetEmojiData(emojiName)
    {
        const emoji = RetrieveEmojiData(emojiName);

        return {name: emojiName, id: emoji.id, animated: emoji.animated};
    }
}