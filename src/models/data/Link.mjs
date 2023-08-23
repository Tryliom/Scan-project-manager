export class Link
{
    /** @type {string} */
    Title
    /** @type {string} */
    Link

    constructor(data)
    {
        this.Title = data.Title;
        this.Link = data.Link;
    }
}