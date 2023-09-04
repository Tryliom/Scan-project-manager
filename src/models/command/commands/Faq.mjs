import {Command} from "../Command.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {CustomMenu} from "../../menus/CustomMenu.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";

export class Faq extends Command
{
    constructor()
    {
        super("faq", "", 0, "If you forgot or don't know how to do things, go check with this.");
    }

    async Run(interaction)
    {
        const embeds = [];
        const faqs = ScanProjectManager.Instance.DataCenter.GetFaqs();

        for (const faq of faqs)
        {
            embeds.push(faq.ToEmbed());
        }

        if (embeds.length === 0)
        {
            embeds.push(EmbedUtility.GetNeutralEmbedMessage("No FAQ found"));
        }

        await new CustomMenu(interaction, embeds).LaunchMenu();
    }
}