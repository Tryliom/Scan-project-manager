export class Changelog
{
    /** @type {string} */
    Version = ""
    /** @type {string} */
    Changes = ""

    constructor()
    {
        this.Version = "";
        this.Changes = "";
    }

    FromJson(data)
    {
        this.Version = data.Version;
        this.Changes = data.Changes;

        return this;
    }
}