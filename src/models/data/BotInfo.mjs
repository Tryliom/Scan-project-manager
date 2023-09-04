import {Changelog} from "./Changelog.mjs";
import {Faq} from "./Faq.mjs";

export class BotInfo
{
    /** @type {Changelog[]} */
    Changelogs = []
    /** @type {Faq[]} */
    Faqs = []

    constructor()
    {
        this.Changelogs = [];
        this.Faqs = [];
    }

    FromJson(data)
    {
        this.Changelogs = [];
        this.Faqs = [];

        if (!data) return this;

        for (const changelog of data.Changelogs)
        {
            this.Changelogs.push(new Changelog().FromJson(changelog));
        }

        for (const faq of data.Faqs)
        {
            this.Faqs.push(new Faq().FromJson(faq));
        }

        return this;
    }
}