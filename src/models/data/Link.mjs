export class Link
{
    /** @type {string} */
    Title = ""
    /** @type {string} */
    Link = ""

    constructor()
    {
        this.Title = "";
        this.Link = "";
    }

    FromJson(data)
    {
        this.Title = data.Title;
        this.Link = data.Link;

        return this;
    }
}