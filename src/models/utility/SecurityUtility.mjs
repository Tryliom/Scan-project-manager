import {PermissionFlagsBits} from "discord-api-types/v10";

export class SecurityUtility
{
    static IsAdmin(interaction)
    {
        return interaction.guildId && interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.user.id === process.env.creatorId;
    }
}