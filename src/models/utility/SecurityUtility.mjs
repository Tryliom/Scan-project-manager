import {PermissionFlagsBits} from "discord-api-types/v10";

export class SecurityUtility
{
    static IsAdmin(interaction)
    {
        return interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.member.id === process.env.creatorId;
    }
}