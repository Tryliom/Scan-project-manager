export class Changelog
{
    /** @type {string} */
    Version = ""
    /** @type {string} */
    Changes = ""
    /** @type {Date} */
    PostedAt = new Date()

    constructor()
    {
        this.Version = "";
        this.Changes = "";
        this.PostedAt = new Date();
    }

    FromJson(data)
    {
        this.Version = data.Version;
        this.Changes = data.Changes;
        this.PostedAt = new Date(data.PostedAt);

        return this;
    }
}