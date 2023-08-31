export const StatsType =
{
    ChapterDone: 0
}

export const TimeType =
{
    Weekly: 0,
    Monthly: 1
}

export function TimeTypeToString(timeType)
{
    switch (timeType)
    {
        case TimeType.Weekly: return "Weekly";
        case TimeType.Monthly: return "Monthly";
    }

    return "Unknown";
}

export class ServerStats
{
    /** @type {boolean[]} */
    Enabled = [false]

    /** @type {Object<string, number>} */
    ChapterDoneTimeSpecific = {}
    /** @type {number} */
    ChapterDoneTimeType = TimeType.Monthly
    /** @type {Date} */
    ChapterDoneTimeLastUpdate = new Date()

    /** @type {string} */
    ChannelId = ""

    constructor()
    {
        this.Enabled = [false];

        this.ChapterDoneTimeSpecific = {};
        this.ChapterDoneTimeType = TimeType.Monthly;
        this.ChapterDoneTimeLastUpdate = new Date();

        this.ChannelId = "";
    }

    FromJson(data)
    {
        this.Enabled = data.Enabled;

        this.ChapterDoneTimeSpecific = data.ChapterDoneTimeSpecific;
        this.ChapterDoneTimeType = data.ChapterDoneTimeType;
        this.ChapterDoneTimeLastUpdate = new Date(data.ChapterDoneTimeLastUpdate);

        this.ChannelId = data.ChannelId;

        return this;
    }

    IncreaseChapterDone(userId, nbChapters = 1)
    {
        if (this.ChapterDoneTimeSpecific[userId] === undefined) this.ChapterDoneTimeSpecific[userId] = 0;
        this.ChapterDoneTimeSpecific[userId] += nbChapters;
    }

    ResetTimeSpecific()
    {
        this.ChapterDoneTimeSpecific = {};
        this.ChapterDoneTimeLastUpdate = new Date();
    }

    SwitchTimeType()
    {
        this.ChapterDoneTimeType = this.ChapterDoneTimeType === TimeType.Weekly ? TimeType.Monthly : TimeType.Weekly;
    }
}