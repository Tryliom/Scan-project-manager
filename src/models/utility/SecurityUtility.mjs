export class SecurityUtility
{
    static IsAdmin(interaction)
    {
        return interaction.member.permissions.has("ADMINISTRATOR") || interaction.member.id === process.env.creatorId;
    }
}